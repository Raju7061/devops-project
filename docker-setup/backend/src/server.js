const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection Pool
const pgPool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT) || 5432,
        ssl: { rejectUnauthorized: false }
      }
);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Direct PostgreSQL Search endpoint (replaces Elasticsearch)
app.get('/api/todos/search', async (req, res) => {
  const query = (req.query.q || '').trim();

  try {
    let result;
    if (query) {
      result = await pgPool.query(
        'SELECT * FROM todos WHERE title ILIKE $1 OR description ILIKE $1 ORDER BY id DESC',
        [`%${query}%`]
      );
    } else {
      result = await pgPool.query('SELECT * FROM todos ORDER BY id DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Search error in PostgreSQL:', err);
    res.status(500).json({ error: err.message, hits: [] });
  }
});

// Fallback List all todos
app.get('/api/todos', async (req, res) => {
  try {
    const result = await pgPool.query('SELECT * FROM todos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Insert todo into PostgreSQL
app.post('/api/todos', async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pgPool.query(
      'INSERT INTO todos (title, description) VALUES ($1, $2) RETURNING *',
      [title, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update completed status
app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  try {
    const result = await pgPool.query(
      'UPDATE todos SET completed = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [completed, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete todo
app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pgPool.query('DELETE FROM todos WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));

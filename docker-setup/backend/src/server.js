const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { Client } = require('@elastic/elasticsearch');

const app = express();
app.use(cors());
app.use(express.json());

// Dynamic PostgreSQL Pool setup with SSL support
const pgPool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: Number(process.env.DB_PORT) || 5432,
        ssl: {
          rejectUnauthorized: false
        }
      }
);

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200'
});

// Health check endpoint
app.get('/health', async (req, res) => {
  res.json({ status: 'ok' });
});

// Writes go directly to PostgreSQL (Debezium captures this via WAL)
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

app.put('/api/todos/:id', async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Field "completed" (boolean) is required' });
  }

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

app.delete('/api/todos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pgPool.query('DELETE FROM  todos WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/todos/search', async (req, res) => {
  const query = (req.query.q || '').trim();

  try {
    const indexExists = await esClient.indices.exists({ index: 'todos' });
    if (!indexExists) {
      return res.json([]);
    }

    const searchQuery = query
      ? {
          multi_match: {
            query,
            fields: ['title^2', 'description']
          }
        }
      : { match_all: {} };

    // Compatible with modern @elastic/elasticsearch v8.x syntax
    const result = await esClient.search({
      index: 'todos',
      query: searchQuery,
      sort: [{ created_at: { order: 'desc' } }]
    });

    const hits = result.hits.hits.map(h => ({ ...h._source, id: h._id }));
    res.json(hits);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message, hits: [] });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend server running on aa port ${PORT}`));

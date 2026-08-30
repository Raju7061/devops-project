import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = '/api';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Fetch todos directly from PostgreSQL
  const fetchTodos = useCallback(async (term = '') => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/todos/search?q=${encodeURIComponent(term)}`);
      setTodos(res.data || []);
      setStatusMsg('Connected to PostgreSQL');
    } catch (err) {
      console.error('Fetch error:', err);
      setStatusMsg('Database Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos(search);
  }, [search, fetchTodos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      await axios.post(`${API_BASE}/todos`, { title, description });
      setTitle('');
      setDescription('');
      fetchTodos(search);
    } catch (err) {
      alert('Error inserting record: ' + err.message);
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    try {
      await axios.put(`${API_BASE}/todos/${id}`, { completed: !currentStatus });
      fetchTodos(search);
    } catch (err) {
      alert('Error updating record: ' + err.message);
    }
  };

  const deleteTodo = async (id) => {
    try {
      await axios.delete(`${API_BASE}/todos/${id}`);
      fetchTodos(search);
    } catch (err) {
      alert('Error deleting record: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Direct PostgreSQL To-Do App</h2>
        <p style={{ margin: 0, fontSize: '13px', color: statusMsg.includes('Error') ? '#dc2626' : '#16a34a' }}>
          <strong>DB Status:</strong> {statusMsg || 'Checking connection...'}
        </p>
      </div>

      {/* Add Task */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        <input
          type="text"
          placeholder="Task title (e.g. Test Database Write)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ padding: '10px 12px', fontSize: '14px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
        />
        <button
          type="submit"
          style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
        >
          Add to PostgreSQL
        </button>
      </form>

      {/* Search Input */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Live search database by title/desc..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #94a3b8', borderRadius: '6px', background: '#f8fafc' }}
        />
      </div>

      {/* List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>Tasks in PostgreSQL</h3>
          {loading && <span style={{ fontSize: '12px', color: '#64748b' }}>Refreshing...</span>}
        </div>

        {todos.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '6px' }}>
            No tasks found in PostgreSQL table.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todos.map((todo) => (
              <div
                key={todo.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: todo.completed ? '#f8fafc' : '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(todo.completed)}
                    onChange={() => toggleComplete(todo.id, todo.completed)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ textDecoration: todo.completed ? 'line-through' : 'none', fontWeight: '600', color: todo.completed ? '#94a3b8' : '#1e293b' }}>
                      {todo.title}
                    </span>
                    {todo.description && (
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{todo.description}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

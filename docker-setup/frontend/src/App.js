// import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios';

// const API_BASE = '/api';

// export default function App() {
//   const [todos, setTodos] = useState([]);
//   const [title, setTitle] = useState('');
//   const [description, setDescription] = useState('');
//   const [search, setSearch] = useState('');
//   const [loading, setLoading] = useState(false);

//   const fetchTodos = useCallback(async (term = '') => {
//     setLoading(true);
//     try {
//       const res = await axios.get(`${API_BASE}/todos/search?q=${encodeURIComponent(term)}`);
//       setTodos(res.data || []);
//     } catch (err) {
//       console.error('Fetch error:', err);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchTodos(search);
//   }, [search, fetchTodos]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!title.trim()) return;
//     try {
//       await axios.post(`${API_BASE}/todos`, { title, description });
//       setTitle('');
//       setDescription('');
//       setTimeout(() => fetchTodos(search), 600);
//     } catch (err) {
//       alert('Error creating todo: ' + err.message);
//     }
//   };

//   const toggleComplete = async (id, currentStatus) => {
//     try {
//       await axios.put(`${API_BASE}/todos/${id}`, { completed: !currentStatus });
//       setTimeout(() => fetchTodos(search), 600);
//     } catch (err) {
//       alert('Error updating todo: ' + err.message);
//     }
//   };

//   const deleteTodo = async (id) => {
//     try {
//       await axios.delete(`${API_BASE}/todos/${id}`);
//       setTimeout(() => fetchTodos(search), 600);
//     } catch (err) {
//       alert('Error deleting todo: ' + err.message);
//     }
//   };

//   return (
//     <div style={{ maxWidth: 700, margin: '40px auto', padding: '24px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 18px rgba(0,0,0,0.08)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
//       <div style={{ borderBottom: '2px solid #eef2f6', paddingBottom: '16px', marginBottom: '24px' }}>
//         <h1 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>Event-Driven CDC To-Do App</h1>
//         <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
//           <strong>Writes:</strong> PostgreSQL &rarr; <strong>CDC:</strong> Debezium &rarr; <strong>Streaming:</strong> Kafka &rarr; <strong>Reads/Search:</strong> Elasticsearch
//         </p>
//       </div>

//       <form onSubmit={handleSubmit} style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
//         <input
//           type="text"
//           placeholder="Task title (e.g., Deploy to EKS)"
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//           required
//           style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '15px' }}
//         />
//         <textarea
//           placeholder="Task details and acceptance criteria..."
//           value={description}
//           onChange={(e) => setDescription(e.target.value)}
//           rows={2}
//           style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
//         />
//         <button
//           type="submit"
//           style={{ padding: '10px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
//         >
//           Add Task to PostgreSQL
//         </button>
//       </form>

//       <div style={{ marginBottom: '20px' }}>
//         <input
//           type="text"
//           placeholder="🔍 Full-text search across tasks in Elasticsearch..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #94a3b8', background: '#f8fafc', fontSize: '14px', boxSizing: 'border-box' }}
//         />
//       </div>

//       <div>
//         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
//           <h3 style={{ margin: 0, fontSize: '16px', color: '#334155' }}>Tasks (Queried via Elasticsearch CQRS)</h3>
//           {loading && <span style={{ fontSize: '12px', color: '#64748b' }}>Refreshing...</span>}
//         </div>
//         {todos.length === 0 ? (
//           <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', border: '2px dashed #e2e8f0', borderRadius: '8px' }}>
//             No tasks found. Add a new task or modify your search term.
//           </div>
//         ) : (
//           <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
//             {todos.map((todo) => (
//               <div
//                 key={todo.id}
//                 style={{
//                   display: 'flex',
//                   alignItems: 'center',
//                   justifyContent: 'space-between',
//                   padding: '12px 16px',
//                   background: todo.completed ? '#f8fafc' : '#ffffff',
//                   border: '1px solid #e2e8f0',
//                   borderRadius: '6px'
//                 }}
//               >
//                 <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
//                   <input
//                     type="checkbox"
//                     checked={Boolean(todo.completed)}
//                     onChange={() => toggleComplete(todo.id, todo.completed)}
//                     style={{ marginTop: '4px', cursor: 'pointer' }}
//                   />
//                   <div>
//                     <div
//                       style={{
//                         fontSize: '15px',
//                         fontWeight: '600',
//                         color: todo.completed ? '#94a3b8' : '#1e293b',
//                         textDecoration: todo.completed ? 'line-through' : 'none'
//                       }}
//                     >
//                       {todo.title}
//                     </div>
//                     {todo.description && (
//                       <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
//                         {todo.description}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => deleteTodo(todo.id)}
//                   style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
//                 >
//                   Delete
//                 </button>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = '/api';

const PIPELINE_STAGES = [
  { id: 'client', name: 'React Client', icon: '💻', desc: 'User action trigger' },
  { id: 'backend', name: 'Node.js API', icon: '🚀', desc: 'REST Endpoint' },
  { id: 'postgres', name: 'PostgreSQL', icon: '🐘', desc: 'WAL Write' },
  { id: 'debezium', name: 'Debezium CDC', icon: '⚡', desc: 'Log Capture' },
  { id: 'kafka', name: 'Kafka Topic', icon: '📨', desc: 'Event Bus' },
  { id: 'consumer', name: 'CDC Consumer', icon: '⚙️', desc: 'Stream Processor' },
  { id: 'elastic', name: 'Elasticsearch', icon: '🔍', desc: 'CQRS Document Store' }
];

export default function App() {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  
  // Pipeline tracking
  const [activeStage, setActiveStage] = useState(null);
  const [pipelineLog, setPipelineLog] = useState('System ready. Add, toggle, or search tasks to trigger the CDC pipeline.');
  const [pipelineMode, setPipelineMode] = useState('idle'); // 'write' | 'read' | 'idle'

  const timeoutRef = useRef(null);

  // Trigger glowing pipeline stages left-to-right (Write) or right-to-left (Read CQRS)
  const animatePipeline = (stages, mode, message) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPipelineMode(mode);
    setPipelineLog(message);
    
    stages.forEach((stage, index) => {
      setTimeout(() => {
        setActiveStage(stage);
      }, index * 220);
    });

    // Reset back to idle
    timeoutRef.current = setTimeout(() => {
      setActiveStage(null);
      setPipelineMode('idle');
    }, stages.length * 220 + 800);
  };

  const fetchTodos = useCallback(async (term = '') => {
    setLoading(true);
    if (term) {
      animatePipeline(['client', 'backend', 'elastic'], 'read', `CQRS Querying Elasticsearch for "${term}"`);
    }
    try {
      const res = await axios.get(`${API_BASE}/todos/search?q=${encodeURIComponent(term)}`);
      setTodos(res.data || []);
    } catch (err) {
      console.error('Fetch error:', err);
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

    animatePipeline(
      ['client', 'backend', 'postgres', 'debezium', 'kafka', 'consumer', 'elastic'],
      'write',
      `[Write CDC Event] Inserting "${title}" -> Postgres WAL -> Debezium -> Kafka -> ES`
    );

    try {
      await axios.post(`${API_BASE}/todos`, { title, description });
      setTitle('');
      setDescription('');
      // Delay fetch slightly to allow Kafka/ES CDC sync to complete
      setTimeout(() => fetchTodos(search), 700);
    } catch (err) {
      alert('Error creating todo: ' + err.message);
    }
  };

  const toggleComplete = async (id, currentStatus) => {
    animatePipeline(
      ['client', 'backend', 'postgres', 'debezium', 'kafka', 'consumer', 'elastic'],
      'write',
      `[Update CDC Event] Updating Todo #${id} status to ${!currentStatus ? 'completed' : 'pending'}`
    );

    try {
      await axios.put(`${API_BASE}/todos/${id}`, { completed: !currentStatus });
      setTimeout(() => fetchTodos(search), 700);
    } catch (err) {
      alert('Error updating todo: ' + err.message);
    }
  };

  const deleteTodo = async (id) => {
    setDeletingId(id);
    animatePipeline(
      ['client', 'backend', 'postgres', 'debezium', 'kafka', 'consumer', 'elastic'],
      'write',
      `[Delete CDC Event] Deleting Todo #${id} -> Debezium Tombstone -> Kafka -> ES Delete`
    );

    try {
      await axios.delete(`${API_BASE}/todos/${id}`);
      setTimeout(() => {
        fetchTodos(search);
        setDeletingId(null);
      }, 700);
    } catch (err) {
      alert('Error deleting todo: ' + err.message);
      setDeletingId(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.badge}>DevOps CQRS & CDC Architecture</div>
        <h1 style={styles.title}>Event-Driven Realtime To-Do Platform</h1>
        <p style={styles.subtitle}>
          Writes hit <strong>PostgreSQL</strong> &rarr; Captured via <strong>Debezium WAL</strong> &rarr; Streamed through <strong>Kafka</strong> &rarr; Indexed to <strong>Elasticsearch</strong>
        </p>
      </header>

      {/* Live Pipeline Visualizer */}
      <section style={styles.pipelineCard}>
        <div style={styles.pipelineHeader}>
          <div style={styles.liveIndicator}>
            <span style={{
              ...styles.liveDot,
              backgroundColor: pipelineMode === 'idle' ? '#10b981' : '#22c55e',
              boxShadow: pipelineMode !== 'idle' ? '0 0 12px #22c55e' : 'none'
            }} />
            <span style={styles.pipelineTitle}>Live CDC Pipeline Stream Monitor</span>
          </div>
          <span style={styles.modeBadge}>Mode: {pipelineMode.toUpperCase()}</span>
        </div>

        <div style={styles.nodesWrapper}>
          {PIPELINE_STAGES.map((stage, idx) => {
            const isActive = activeStage === stage.id;
            return (
              <React.Fragment key={stage.id}>
                <div style={{
                  ...styles.node,
                  borderColor: isActive ? '#22c55e' : '#334155',
                  backgroundColor: isActive ? 'rgba(34, 197, 94, 0.15)' : '#1e293b',
                  transform: isActive ? 'scale(1.08)' : 'scale(1)',
                  boxShadow: isActive ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none'
                }}>
                  <div style={styles.nodeIcon}>{stage.icon}</div>
                  <div style={{
                    ...styles.nodeName,
                    color: isActive ? '#4ade80' : '#f8fafc'
                  }}>{stage.name}</div>
                  <div style={styles.nodeDesc}>{stage.desc}</div>
                </div>

                {idx < PIPELINE_STAGES.length - 1 && (
                  <div style={styles.connectorWrapper}>
                    <div style={{
                      ...styles.connectorLine,
                      background: isActive ? 'linear-gradient(90deg, #22c55e, #10b981)' : '#334155',
                      boxShadow: isActive ? '0 0 10px #22c55e' : 'none'
                    }} />
                    <span style={{
                      ...styles.connectorArrow,
                      color: isActive ? '#22c55e' : '#475569'
                    }}>&rarr;</span>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div style={styles.terminalBox}>
          <span style={{ color: '#22c55e', marginRight: '8px' }}>$&gt;</span>
          <span>{pipelineLog}</span>
        </div>
      </section>

      {/* Main Content: Form & Search & List */}
      <div style={styles.grid}>
        {/* Left Column: Create Task */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>➕ Create New Task</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Task Title</label>
              <input
                type="text"
                placeholder="e.g. Configure Prometheus monitoring"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={styles.input}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Task Description</label>
              <textarea
                placeholder="Details, subtasks, or acceptance criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ ...styles.input, resize: 'vertical' }}
              />
            </div>
            <button type="submit" style={styles.submitBtn}>
              Commit Task to PostgreSQL
            </button>
          </form>
        </div>

        {/* Right Column: Search & Live Elasticsearch View */}
        <div style={styles.card}>
          <div style={styles.cardHeaderFlex}>
            <h2 style={styles.cardTitle}>⚡ Elasticsearch CQRS View</h2>
            {loading && <span style={styles.spinner}>Syncing...</span>}
          </div>

          <div style={styles.searchWrapper}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search across title and description in Elasticsearch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.todoList}>
            {todos.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📂</div>
                No matching tasks indexed in Elasticsearch.
              </div>
            ) : (
              todos.map((todo) => {
                const isDeleting = deletingId === todo.id;
                return (
                  <div
                    key={todo.id}
                    style={{
                      ...styles.todoItem,
                      opacity: isDeleting ? 0 : 1,
                      transform: isDeleting ? 'translateX(50px)' : 'translateX(0)',
                      backgroundColor: todo.completed ? '#0f172a' : '#1e293b',
                      borderLeft: todo.completed ? '4px solid #64748b' : '4px solid #3b82f6'
                    }}
                  >
                    <div style={styles.todoLeft}>
                      <input
                        type="checkbox"
                        checked={Boolean(todo.completed)}
                        onChange={() => toggleComplete(todo.id, todo.completed)}
                        style={styles.checkbox}
                      />
                      <div>
                        <div style={{
                          ...styles.todoTitleText,
                          textDecoration: todo.completed ? 'line-through' : 'none',
                          color: todo.completed ? '#64748b' : '#f8fafc'
                        }}>
                          {todo.title}
                        </div>
                        {todo.description && (
                          <div style={styles.todoDescText}>{todo.description}</div>
                        )}
                        <div style={styles.todoMeta}>ID: #{todo.id} • Indexed in ES</div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTodo(todo.id)}
                      style={styles.deleteBtn}
                      title="Delete task"
                    >
                      🗑️
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modern Dark Cyberpunk / Cloud-Native Styling
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '32px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    color: '#e2e8f0',
    minHeight: '100vh'
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '9999px',
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid #3b82f6',
    color: '#60a5fa',
    fontSize: '12px',
    fontWeight: '600',
    marginBottom: '12px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    letterSpacing: '-0.025em',
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  subtitle: {
    fontSize: '18px',
    color: '#b594b8',
    margin: 0
  },
  pipelineCard: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
  },
  pipelineHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  liveIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  liveDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'all 0.3s ease'
  },
  pipelineTitle: {
    fontSize: '14px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#cbd5e1'
  },
  modeBadge: {
    fontSize: '11px',
    fontWeight: '650',
    padding: '3px 8px',
    borderRadius: '6px',
    background: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155'
  },
  nodesWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflowX: 'auto',
    padding: '10px 0 20px 0'
  },
  node: {
    minWidth: '120px',
    padding: '14px 10px',
    borderRadius: '12px',
    border: '1px solid #334155',
    textAlign: 'center',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'default'
  },
  nodeIcon: {
    fontSize: '20px',
    marginBottom: '4px'
  },
  nodeName: {
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '2px',
    transition: 'color 0.25s ease'
  },
  nodeDesc: {
    fontSize: '10px',
    color: '#64748b'
  },
  connectorWrapper: {
    display: 'flex',
    alignItems: 'center',
    margin: '0 4px'
  },
  connectorLine: {
    height: '2px',
    width: '18px',
    transition: 'all 0.25s ease'
  },
  connectorArrow: {
    fontSize: '12px',
    marginLeft: '2px',
    transition: 'color 0.25s ease'
  },
  terminalBox: {
    backgroundColor: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '10px 14px',
    fontFamily: '"Fira Code", monospace',
    fontSize: '13px',
    color: '#e2e8f0',
    display: 'flex',
    alignItems: 'center'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '24px'
  },
  card: {
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
  },
  cardHeaderFlex: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 20px 0',
    color: '#f8fafc'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#94a3b8'
  },
  input: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  submitBtn: {
    padding: '12px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background-color 0.2s ease',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
  },
  searchWrapper: {
    position: 'relative',
    marginBottom: '16px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '11px',
    fontSize: '14px'
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '10px 14px 10px 36px',
    color: '#f8fafc',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  spinner: {
    fontSize: '12px',
    color: '#38bdf8'
  },
  todoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '480px',
    overflowY: 'auto'
  },
  emptyState: {
    textAlign: 'center',
    padding: '36px 20px',
    color: '#64748b',
    fontSize: '14px',
    border: '1px dashed #334155',
    borderRadius: '12px'
  },
  todoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #334155',
    transition: 'all 0.3s ease'
  },
  todoLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1
  },
  checkbox: {
    marginTop: '4px',
    cursor: 'pointer',
    accentColor: '#3b82f6'
  },
  todoTitleText: {
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px',
    transition: 'color 0.2s ease'
  },
  todoDescText: {
    fontSize: '16px',
    color: '#94a3b8',
    marginBottom: '4px'
  },
  todoMeta: {
    fontSize: '10px',
    color: '#475569'
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '6px',
    borderRadius: '6px',
    opacity: 0.7,
    transition: 'opacity 0.2s ease'
  }
};

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      nav('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  const demoLogins = [
    { label: 'Admin',   email: 'admin@estate.com',     role: 'admin' },
    { label: 'Manager', email: 'anil.mgr@estate.com',  role: 'manager' },
    { label: 'Agent',   email: 'rahul.agt@estate.com', role: 'agent' },
    { label: 'Client',  email: 'vikram@mail.com',      role: 'client' },
  ];

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <h1>EstateHub</h1>
          <p>Real Estate Management System</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
            />
          </div>
          <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'11px'}} disabled={loading}>
            {loading ? <><div className="spinner" style={{width:16,height:16,marginRight:8}}/>Signing in…</> : 'Sign In'}
          </button>
        </form>

        <div style={{marginTop:24, padding:'16px 0', borderTop:'1px solid var(--border)'}}>
          <p style={{fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:10, textAlign:'center'}}>DEMO LOGINS — password: <strong style={{color:'var(--accent)'}}>password123</strong></p>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
            {demoLogins.map(d => (
              <button
                key={d.label}
                className="btn btn-secondary btn-sm"
                style={{justifyContent:'center'}}
                onClick={() => setForm({email: d.email, password: 'password123'})}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <p style={{textAlign:'center', fontSize:'0.8rem', color:'var(--text-muted)', marginTop:20}}>
          New client?{' '}
          <Link to="/register" style={{color:'var(--accent)'}}>Register here</Link>
        </p>
      </div>
    </div>
  );
}

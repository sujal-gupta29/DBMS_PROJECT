import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const nav = useNavigate();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', color: 'var(--text-primary)'
    }}>
      <div style={{ fontSize: '5rem', marginBottom: 16 }}>🏚️</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--accent)', marginBottom: 8 }}>404</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>This property doesn't exist.</p>
      <button className="btn btn-primary" onClick={() => nav('/')}>Back to Home</button>
    </div>
  );
}

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AgentDashboard from './pages/AgentDashboard';
import ClientDashboard from './pages/ClientDashboard';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function RoleRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  switch (user.role) {
    case 'admin':   return <Navigate to="/admin" replace />;
    case 'manager': return <Navigate to="/manager" replace />;
    case 'agent':   return <Navigate to="/agent" replace />;
    case 'client':  return <Navigate to="/client" replace />;
    default:        return <Navigate to="/login" replace />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<RoleRouter />} />
          <Route path="/admin/*" element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }/>
          <Route path="/manager/*" element={
            <ProtectedRoute roles={['manager', 'admin']}>
              <ManagerDashboard />
            </ProtectedRoute>
          }/>
          <Route path="/agent/*" element={
            <ProtectedRoute roles={['agent', 'manager', 'admin']}>
              <AgentDashboard />
            </ProtectedRoute>
          }/>
          <Route path="/client/*" element={
            <ProtectedRoute roles={['client', 'admin']}>
              <ClientDashboard />
            </ProtectedRoute>
          }/>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

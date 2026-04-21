import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, ListChecks, CalendarCheck,
  BarChart3, Settings, LogOut, Database, Search, FileText, Home, Star
} from 'lucide-react';

const navConfig = {
  admin: [
    { label: 'Overview', items: [
      { icon: LayoutDashboard, label: 'Dashboard',   key: 'dashboard' },
      { icon: BarChart3,      label: 'Analytics',    key: 'analytics' },
    ]},
    { label: 'Management', items: [
      { icon: Users,     label: 'Managers',     key: 'managers' },
      { icon: Users,     label: 'Agents',       key: 'agents' },
      { icon: Users,     label: 'Clients',      key: 'clients' },
      { icon: Building2, label: 'Listings',     key: 'listings' },
      { icon: FileText,  label: 'Transactions', key: 'transactions' },
    ]},
    { label: 'Tools', items: [
      { icon: Database, label: 'SQL Console',  key: 'sql' },
      { icon: Search,   label: 'Queries (a–f)', key: 'queries' },
    ]},
  ],
  manager: [
    { label: 'Overview', items: [
      { icon: LayoutDashboard, label: 'Dashboard',           key: 'dashboard' },
      { icon: Star,            label: 'Agent Performance',  key: 'agentperformance' },
      { icon: BarChart3,       label: 'Performance Charts', key: 'performance' },
    ]},
    { label: 'Operations', items: [
      { icon: Users,         label: 'My Agents',     key: 'agents' },
      { icon: CalendarCheck, label: 'Appointments',  key: 'appointments' },
      { icon: ListChecks,    label: 'Transactions',  key: 'transactions' },
      { icon: Building2,     label: 'Listings',      key: 'listings' },
    ]},
  ],
  agent: [
    { label: 'Overview', items: [
      { icon: Star,            label: 'Performance', key: 'performance' },
    ]},
    { label: 'Work', items: [
      { icon: CalendarCheck, label: 'Appointments', key: 'appointments' },
      { icon: Building2,     label: 'Listings',     key: 'listings' },
    ]},
  ],
  client: [
    { label: 'Overview', items: [
      { icon: LayoutDashboard, label: 'Dashboard',    key: 'dashboard' },
    ]},
    { label: 'Properties', items: [
      { icon: Home,      label: 'My Properties', key: 'properties' },
      { icon: Building2, label: 'Browse Listings', key: 'browse' },
    ]},
    { label: 'Activity', items: [
      { icon: CalendarCheck, label: 'Appointments',  key: 'appointments' },
      { icon: FileText,      label: 'Transactions',  key: 'transactions' },
    ]},
  ],
};

export default function Sidebar({ active, onChange }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  if (!user) return null;
  const sections = navConfig[user.role] || [];

  const handleLogout = () => { logout(); nav('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>EstateHub</h2>
        <span>{user.role.toUpperCase()} PORTAL</span>
      </div>

      {sections.map(section => (
        <div className="nav-section" key={section.label}>
          <div className="nav-label">{section.label}</div>
          {section.items.map(item => (
            <div
              key={item.key}
              className={`nav-item${active === item.key ? ' active' : ''}`}
              onClick={() => onChange(item.key)}
            >
              <item.icon size={16}/>
              {item.label}
            </div>
          ))}
        </div>
      ))}

      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-avatar">{user.name?.[0]?.toUpperCase()}</div>
          <div className="user-info">
            <div className="name">{user.name}</div>
            <div className="role">{user.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          style={{width:'100%', justifyContent:'center', marginTop:10}}
        >
          <LogOut size={14}/> Sign Out
        </button>
      </div>
    </aside>
  );
}

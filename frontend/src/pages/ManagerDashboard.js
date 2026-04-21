import React, { useState, useEffect } from 'react';
import Sidebar from '../components/shared/Sidebar';
import DataTable from '../components/shared/DataTable';
import api, { fmtCurrency, fmtDate, fmtDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  Users, TrendingUp, DollarSign, CalendarCheck,
  ChevronDown, ChevronUp, FileText, ShoppingBag, AlertCircle
} from 'lucide-react';

const COLORS = ['#c9a96e', '#60a5fa', '#4ade80', '#f87171', '#fbbf24', '#a78bfa'];

function StatCard({ icon: Icon, label, value, color = 'var(--accent)' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}22`, color }}><Icon size={18} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardView({ managerId }) {
  const [stats, setStats] = useState(null);
  const [perf, setPerf] = useState([]);
  const [agents, setAgents] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!managerId) return;
    setErr('');
    api.get(`/manager/dashboard/${managerId}`).then(r => setStats(r.data)).catch(e => setErr(e.response?.data?.detail || 'Failed to load dashboard'));
    api.get(`/manager/agent-performance/${managerId}`).then(r => setPerf(r.data)).catch(() => {});
    api.get(`/manager/agents/${managerId}`).then(r => setAgents(r.data)).catch(() => {});
  }, [managerId]);

  if (err) return <div className="alert alert-error"><AlertCircle size={14} /> {err}</div>;
  if (!stats) return <div className="loading"><div className="spinner" />Loading…</div>;

  const agentMonthMap = {};
  perf.forEach(p => {
    if (!agentMonthMap[p.month]) agentMonthMap[p.month] = { month: p.month };
    agentMonthMap[p.month][p.name] = Number(p.revenue);
  });
  const chartData = Object.values(agentMonthMap);
  const agentNames = [...new Set(perf.map(p => p.name))];

  const totalSales = agents.reduce((s, a) => s + (Number(a.sale_deals) || 0), 0);
  const totalRents = agents.reduce((s, a) => s + (Number(a.rent_deals) || 0), 0);
  const dealTypeData = [
    { name: 'Sales', value: totalSales },
    { name: 'Rents', value: totalRents },
  ].filter(d => d.value > 0);

  return (
    <div>
      <div className="stats-grid">
        <StatCard icon={Users} label="Active Agents" value={stats.active_agents} />
        <StatCard icon={CalendarCheck} label="Pending Appointments" value={stats.pending_appointments} color="#f87171" />
        <StatCard icon={TrendingUp} label="Total Deals" value={stats.total_deals} color="#4ade80" />
        <StatCard icon={DollarSign} label="Total Revenue" value={fmtCurrency(stats.revenue)} color="#fbbf24" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-title">Agent Revenue Comparison (Monthly)</div>
          {chartData.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}><p>No revenue data yet</p></div>
          ) : (
            <div style={{ height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} barSize={18}>
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => fmtCurrency(v)} tickLine={false} axisLine={false} />
                  <Tooltip formatter={v => [fmtCurrency(v)]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend />
                  {agentNames.map((n, i) => (
                    <Bar key={n} dataKey={n} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Deal Mix</div>
          {dealTypeData.length > 0 ? (
            <div style={{ height: 200 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={dealTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, value }) => `${name}: ${value}`}>
                    {dealTypeData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}><p>No deals yet</p></div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, fontSize: '0.82rem', marginTop: 8 }}>
            <span style={{ color: COLORS[0] }}>● Sales: {totalSales}</span>
            <span style={{ color: COLORS[1] }}>● Rentals: {totalRents}</span>
          </div>
        </div>
      </div>

      <DataTable
        title="Agent Leaderboard"
        columns={[
          { header: 'Name', accessor: 'name' },
          { header: 'Email', accessor: 'email' },
          { header: 'Total Deals', accessor: 'total_deals' },
          { header: 'Sales', accessor: 'sale_deals' },
          { header: 'Rentals', accessor: 'rent_deals' },
          { header: 'Revenue', accessor: 'total_revenue', render: r => fmtCurrency(r.total_revenue) },
          {
            header: 'Status', accessor: 'active_flag',
            render: r => <span className={`badge ${r.active_flag ? 'badge-success' : 'badge-muted'}`}>{r.active_flag ? 'Active' : 'Inactive'}</span>
          },
        ]}
        data={agents}
      />
    </div>
  );
}

// ── Agent Performance Detail (expandable per-agent) ───────────────────────────
function AgentPerformanceDetailView({ managerId }) {
  const [agents, setAgents] = useState([]);
  const [perf, setPerf] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [agentDetails, setAgentDetails] = useState({});  // { agentId: {sales, rents} }
  const [loadingDetail, setLoadingDetail] = useState({});

  useEffect(() => {
    if (!managerId) return;
    api.get(`/manager/agents/${managerId}`).then(r => setAgents(r.data)).catch(() => {});
    api.get(`/manager/agent-performance/${managerId}`).then(r => setPerf(r.data)).catch(() => {});
  }, [managerId]);

  const toggleExpand = async (agentId) => {
    const isOpen = expanded[agentId];
    setExpanded(e => ({ ...e, [agentId]: !isOpen }));

    // Load details on first expand
    if (!isOpen && !agentDetails[agentId]) {
      setLoadingDetail(l => ({ ...l, [agentId]: true }));
      try {
        const { data } = await api.get(`/manager/agent-details/${agentId}`);
        setAgentDetails(d => ({ ...d, [agentId]: data }));
      } catch {
        setAgentDetails(d => ({ ...d, [agentId]: { sales: [], rents: [] } }));
      } finally {
        setLoadingDetail(l => ({ ...l, [agentId]: false }));
      }
    }
  };

  return (
    <div>
      <div className="card-title" style={{ marginBottom: 16 }}>
        <Users size={16} /> Agent-wise Performance Details
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'var(--font-body)', fontWeight: 400 }}>
          Click any agent card to see full sale & rent details
        </span>
      </div>

      {agents.length === 0 && (
        <div className="empty-state"><Users size={36} /><p>No agents under your supervision.</p></div>
      )}

      {agents.map((agent, idx) => {
        const agentMonthly = perf.filter(p => p.agent_id === agent.agent_id);
        const details = agentDetails[agent.agent_id];
        const isExpanded = expanded[agent.agent_id];
        const isLoading = loadingDetail[agent.agent_id];
        const convRate = agent.total_appointments > 0
          ? ((Number(agent.total_deals) / Number(agent.total_appointments)) * 100).toFixed(1)
          : 0;

        return (
          <div key={agent.agent_id} className="card" style={{ marginBottom: 12, borderColor: isExpanded ? 'var(--accent)' : 'var(--border)' }}>
            {/* Agent Header */}
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => toggleExpand(agent.agent_id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: `${COLORS[idx % COLORS.length]}22`,
                  color: COLORS[idx % COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '1.1rem', flexShrink: 0
                }}>
                  {agent.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{agent.name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{agent.email}</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                {[
                  { label: 'Total Deals', value: agent.total_deals || 0, color: '#4ade80' },
                  { label: 'Sales', value: agent.sale_deals || 0, color: '#60a5fa' },
                  { label: 'Rentals', value: agent.rent_deals || 0, color: '#fbbf24' },
                  { label: 'Revenue', value: fmtCurrency(agent.total_revenue), color: 'var(--accent)' },
                  { label: 'Conv. Rate', value: `${convRate}%`, color: '#a78bfa' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: s.color, fontSize: '0.95rem' }}>{s.value}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
                <span className={`badge ${agent.active_flag ? 'badge-success' : 'badge-muted'}`}>
                  {agent.active_flag ? 'Active' : 'Inactive'}
                </span>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                {isLoading ? (
                  <div className="loading" style={{ height: 80 }}><div className="spinner" />Loading details…</div>
                ) : details ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

                      {/* Sales Panel */}
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600 }}>
                          <ShoppingBag size={14} style={{ color: '#60a5fa' }} />
                          Sale Deals ({details.sales.length})
                          {details.sales.length > 0 && (
                            <span style={{ marginLeft: 'auto', color: '#60a5fa', fontSize: '0.82rem' }}>
                              Total: {fmtCurrency(details.sales.reduce((s, t) => s + (Number(t.sold_price) || 0), 0))}
                            </span>
                          )}
                        </div>
                        {details.sales.length === 0 ? (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0' }}>No sale deals yet</div>
                        ) : details.sales.map(t => (
                          <div key={t.transaction_id} style={{
                            padding: '10px 12px', marginBottom: 8,
                            background: 'var(--bg-card)', borderRadius: 8, fontSize: '0.82rem',
                            borderLeft: '3px solid #60a5fa'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600 }}>{t.property_type} — {t.house_no}, {t.street}, {t.city}</span>
                              <span style={{ color: '#60a5fa', fontWeight: 700 }}>{fmtCurrency(t.sold_price)}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                              <span>Buyer: <strong style={{ color: 'var(--text-secondary)' }}>{t.buyer_name}</strong></span>
                              <span>Seller: <strong style={{ color: 'var(--text-secondary)' }}>{t.seller_name}</strong></span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                              Date: {fmtDate(t.sell_date)} &nbsp;·&nbsp; TXN: <code style={{ fontSize: '0.75rem' }}>{t.transaction_id}</code>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Rent Panel */}
                      <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 600 }}>
                          <FileText size={14} style={{ color: '#fbbf24' }} />
                          Rent Deals & Agreements ({details.rents.length})
                        </div>
                        {details.rents.length === 0 ? (
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0' }}>No rent deals yet</div>
                        ) : details.rents.map(t => (
                          <div key={t.transaction_id} style={{
                            padding: '10px 12px', marginBottom: 8,
                            background: 'var(--bg-card)', borderRadius: 8, fontSize: '0.82rem',
                            borderLeft: '3px solid #fbbf24'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontWeight: 600 }}>{t.property_type} — {t.house_no}, {t.street}, {t.city}</span>
                              <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fmtCurrency(t.rent_amount)}/mo</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                              <span>Tenant: <strong style={{ color: 'var(--text-secondary)' }}>{t.tenant_name}</strong></span>
                              <span>Landlord: <strong style={{ color: 'var(--text-secondary)' }}>{t.landlord_name}</strong></span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                              From: {fmtDate(t.sell_date)} &nbsp;→&nbsp; Until: <strong>{fmtDate(t.rent_end)}</strong>
                            </div>
                            {t.security_deposit > 0 && (
                              <div style={{ color: 'var(--text-muted)' }}>
                                Security Deposit: <strong style={{ color: 'var(--text-secondary)' }}>{fmtCurrency(t.security_deposit)}</strong>
                              </div>
                            )}
                            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
                              Agreement ID: <code style={{ fontSize: '0.75rem' }}>{t.rent_id || '—'}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly Trend */}
                    {agentMonthly.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 10 }}>Monthly Revenue Trend</div>
                        <div style={{ height: 140 }}>
                          <ResponsiveContainer>
                            <BarChart data={agentMonthly} barSize={16}>
                              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickLine={false} />
                              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} tickFormatter={v => fmtCurrency(v)} tickLine={false} axisLine={false} />
                              <Tooltip formatter={v => [fmtCurrency(v), 'Revenue']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                              <Bar dataKey="revenue" fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Agents Table ──────────────────────────────────────────────────────────────
function AgentsView({ managerId }) {
  const [agents, setAgents] = useState([]);
  useEffect(() => {
    if (managerId) api.get(`/manager/agents/${managerId}`).then(r => setAgents(r.data)).catch(() => {});
  }, [managerId]);
  return (
    <DataTable
      title="My Agents"
      columns={[
        { header: 'Name', accessor: 'name' },
        { header: 'Email', accessor: 'email' },
        { header: 'Phone', accessor: 'phone' },
        { header: 'Hire Date', accessor: 'hire_date', render: r => fmtDate(r.hire_date) },
        { header: 'Salary', accessor: 'base_salary', render: r => fmtCurrency(r.base_salary) },
        { header: 'Appointments', accessor: 'total_appointments' },
        { header: 'Deals', accessor: 'total_deals' },
        { header: 'Sales', accessor: 'sale_deals' },
        { header: 'Rentals', accessor: 'rent_deals' },
        { header: 'Revenue', accessor: 'total_revenue', render: r => fmtCurrency(r.total_revenue) },
        {
          header: 'Status', accessor: 'active_flag',
          render: r => <span className={`badge ${r.active_flag ? 'badge-success' : 'badge-muted'}`}>{r.active_flag ? 'Active' : 'Inactive'}</span>
        },
      ]}
      data={agents}
    />
  );
}

// ── Appointments ──────────────────────────────────────────────────────────────
function AppointmentsView({ managerId }) {
  const [apts, setApts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (managerId) api.get(`/manager/appointments/${managerId}?status=${filter}`).then(r => setApts(r.data)).catch(() => {});
  }, [managerId, filter]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {['all', 'pending', 'done'].map(f => (
          <button key={f} className={`tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <DataTable
        title="Appointments"
        columns={[
          { header: 'Agent', accessor: 'agent_name' },
          { header: 'Buyer', accessor: 'buyer_name' },
          { header: 'City', accessor: 'city' },
          {
            header: 'Type', accessor: 'listing_type',
            render: r => <span className={`badge ${r.listing_type === 'RENT' ? 'badge-info' : 'badge-accent'}`}>{r.listing_type}</span>
          },
          { header: 'Scheduled', accessor: 'schedule_date_time', render: r => fmtDateTime(r.schedule_date_time) },
          {
            header: 'Status', accessor: 'deal_status',
            render: r => {
              if (r.deal_status === 1) return <span className="badge badge-success">Successful</span>;
              if (r.deal_status === 2) return <span className="badge badge-danger">Failed</span>;
              return <span className="badge badge-warning">Pending</span>;
            }
          },
        ]}
        data={apts}
      />
    </div>
  );
}

// ── Transactions ──────────────────────────────────────────────────────────────
function TransactionsView({ managerId }) {
  const [txns, setTxns] = useState([]);
  useEffect(() => {
    if (managerId) api.get(`/manager/transactions/${managerId}`).then(r => setTxns(r.data)).catch(() => {});
  }, [managerId]);
  return (
    <DataTable
      title="All Transactions"
      columns={[
        { header: 'Date', accessor: 'sell_date', render: r => fmtDate(r.sell_date) },
        { header: 'Agent', accessor: 'agent_name' },
        { header: 'Buyer/Tenant', accessor: 'buyer_name' },
        { header: 'Seller/Landlord', accessor: 'seller_name' },
        { header: 'City', accessor: 'city' },
        {
          header: 'Type', accessor: 'listing_type',
          render: r => <span className={`badge ${r.listing_type === 'RENT' ? 'badge-info' : 'badge-accent'}`}>{r.listing_type}</span>
        },
        { header: 'Sale Amount', render: r => r.sold_price ? fmtCurrency(r.sold_price) : '—' },
        { header: 'Rent/mo', render: r => r.rent_amount ? `${fmtCurrency(r.rent_amount)}/mo` : '—' },
        { header: 'Rent Until', render: r => r.rent_end ? fmtDate(r.rent_end) : '—' },
        { header: 'Security Dep.', render: r => r.security_deposit ? fmtCurrency(r.security_deposit) : '—' },
      ]}
      data={txns}
    />
  );
}

// ── Listings ──────────────────────────────────────────────────────────────────
function ListingsView() {
  const [listings, setListings] = useState([]);
  useEffect(() => { api.get('/manager/listings').then(r => setListings(r.data)).catch(() => {}); }, []);
  return (
    <DataTable
      title="All Listings"
      columns={[
        {
          header: 'Type', accessor: 'listing_type',
          render: r => <span className={`badge ${r.listing_type === 'RENT' ? 'badge-info' : r.listing_type === 'BOTH' ? 'badge-warning' : 'badge-accent'}`}>{r.listing_type}</span>
        },
        { header: 'Property', accessor: 'property_type' },
        { header: 'City', accessor: 'city' },
        { header: 'Locality', accessor: 'locality_name' },
        { header: 'Bedrooms', accessor: 'bedrooms' },
        { header: 'Rent', render: r => r.price_rent ? fmtCurrency(r.price_rent) : '—' },
        { header: 'Sale Price', render: r => r.price_sell ? fmtCurrency(r.price_sell) : '—' },
        {
          header: 'Status', accessor: 'status',
          render: r => {
            const c = { ACTIVE: 'badge-success', SOLD: 'badge-muted', RENTED: 'badge-info', WITHDRAWN: 'badge-danger' };
            return <span className={`badge ${c[r.status] || 'badge-muted'}`}>{r.status}</span>;
          }
        },
        { header: 'Owner', accessor: 'owner_name' },
      ]}
      data={listings}
    />
  );
}

// ── Performance Chart ─────────────────────────────────────────────────────────
function PerformanceView({ managerId }) {
  const [perf, setPerf] = useState([]);
  const [agents, setAgents] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!managerId) return;
    api.get(`/manager/agent-performance/${managerId}`).then(r => setPerf(r.data)).catch(e => setErr(e.response?.data?.detail || 'Failed to load'));
    api.get(`/manager/agents/${managerId}`).then(r => setAgents(r.data)).catch(() => {});
  }, [managerId]);

  if (err) return <div className="alert alert-error"><AlertCircle size={14} /> {err}</div>;

  const agentMonthMap = {};
  perf.forEach(p => {
    if (!agentMonthMap[p.month]) agentMonthMap[p.month] = { month: p.month };
    agentMonthMap[p.month][p.name] = Number(p.revenue);
  });
  const chartData = Object.values(agentMonthMap);
  const agentNames = [...new Set(perf.map(p => p.name))];

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title">Monthly Performance by Agent</div>
        {chartData.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 0' }}><p>No performance data yet</p></div>
        ) : (
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => fmtCurrency(v)} tickLine={false} axisLine={false} />
                <Tooltip formatter={v => [fmtCurrency(v)]} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Legend />
                {agentNames.map((n, i) => (
                  <Line key={n} type="monotone" dataKey={n} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <DataTable
        title="Agent Conversion Rates"
        columns={[
          { header: 'Agent', accessor: 'name' },
          { header: 'Appointments', accessor: 'total_appointments' },
          { header: 'Total Deals', accessor: 'total_deals' },
          { header: 'Sales', accessor: 'sale_deals' },
          { header: 'Rentals', accessor: 'rent_deals' },
          { header: 'Revenue', accessor: 'total_revenue', render: r => fmtCurrency(r.total_revenue) },
          {
            header: 'Conv. Rate', sortable: false,
            render: r => {
              const rate = r.total_appointments > 0
                ? ((Number(r.total_deals) / Number(r.total_appointments)) * 100).toFixed(1) : 0;
              return <span style={{ color: 'var(--accent)' }}>{rate}%</span>;
            }
          },
        ]}
        data={agents}
        pageSize={10}
      />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
const views = {
  dashboard:        { title: 'Dashboard',           sub: 'Team overview',                 Component: DashboardView },
  agentperformance: { title: 'Agent Performance',   sub: 'Detailed per-agent breakdown',  Component: AgentPerformanceDetailView },
  performance:      { title: 'Performance Charts',  sub: 'Monthly analytics',             Component: PerformanceView },
  agents:           { title: 'My Agents',           sub: 'Agents under your supervision', Component: AgentsView },
  appointments:     { title: 'Appointments',        sub: 'All team appointments',         Component: AppointmentsView },
  transactions:     { title: 'Transactions',        sub: 'All team transactions',         Component: TransactionsView },
  listings:         { title: 'Listings',            sub: 'All property listings',         Component: ListingsView },
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [active, setActive] = useState('dashboard');
  const view = views[active] || views.dashboard;
  const { Component } = view;

  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActive} />
      <div className="main-content">
        <div className="topbar">
          <span className="topbar-title">Manager Panel — {user?.name}</span>
        </div>
        <div className="page">
          <div className="page-header">
            <h1>{view.title}</h1>
            <p>{view.sub}</p>
          </div>
          <Component managerId={user?.id} />
        </div>
      </div>
    </div>
  );
}

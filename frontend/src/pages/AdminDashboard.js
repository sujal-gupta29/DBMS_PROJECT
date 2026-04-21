import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/shared/Sidebar';
import DataTable from '../components/shared/DataTable';
import api, { fmtCurrency, fmtDate, fmtDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import {
  Building2, Users, TrendingUp, DollarSign, Activity,
  PlayCircle, Plus, Trash2, AlertCircle, CheckCircle, Database
} from 'lucide-react';
import {
  validateName, validateEmail, validatePhone,
  validateAadhaar, validatePassword, validateSalary
} from '../utils/validators';

const COLORS = ['#c9a96e','#60a5fa','#4ade80','#f87171','#fbbf24','#a78bfa','#34d399'];

function StatCard({ icon: Icon, label, value, color = 'var(--accent)' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{background: `${color}22`, color}}>
        <Icon size={18}/>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Dashboard Overview ────────────────────────────────────────────────────────
function DashboardView() {
  const [stats, setStats] = useState(null);
  const [salesByMonth, setSalesByMonth] = useState([]);
  const [salesByCity, setSalesByCity] = useState([]);
  const [revTrend, setRevTrend] = useState([]);
  const [propTypeDist, setPropTypeDist] = useState([]);

  useEffect(() => {
    api.get('/admin/dashboard').then(r => setStats(r.data));
    api.get('/admin/analytics/sales-by-month').then(r => setSalesByMonth(r.data));
    api.get('/admin/analytics/sales-by-city').then(r => setSalesByCity(r.data));
    api.get('/admin/analytics/revenue-trend').then(r => setRevTrend(r.data));
    api.get('/admin/analytics/property-type-dist').then(r => setPropTypeDist(r.data));
  }, []);

  if (!stats) return <div className="loading"><div className="spinner"/>Loading…</div>;

  return (
    <div>
      <div className="stats-grid">
        <StatCard icon={Building2} label="Total Properties" value={stats.total_properties}/>
        <StatCard icon={Users}     label="Total Clients"    value={stats.total_clients}/>
        <StatCard icon={Users}     label="Active Agents"    value={stats.active_agents} color="#60a5fa"/>
        <StatCard icon={Users}     label="Active Managers"  value={stats.active_managers} color="#a78bfa"/>
        <StatCard icon={Activity}  label="Active Listings"  value={stats.active_listings} color="#4ade80"/>
        <StatCard icon={CheckCircle} label="Transactions"   value={stats.total_transactions} color="#34d399"/>
        <StatCard icon={DollarSign} label="Total Revenue"   value={fmtCurrency(stats.total_revenue)} color="#fbbf24"/>
        <StatCard icon={TrendingUp} label="Pending Apts"    value={stats.pending_appointments} color="#f87171"/>
      </div>

      <div className="grid-2" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-title"><TrendingUp size={16}/>Revenue by Month</div>
          <div className="chart-container">
            <ResponsiveContainer>
              <AreaChart data={salesByMonth}>
                <XAxis dataKey="month" tick={{fill:'var(--text-muted)', fontSize:11}} tickLine={false}/>
                <YAxis tick={{fill:'var(--text-muted)', fontSize:10}} tickFormatter={v=>`₹${(v/100000).toFixed(0)}L`} tickLine={false} axisLine={false}/>
                <Tooltip formatter={(v)=>[fmtCurrency(v),'Revenue']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                <Area type="monotone" dataKey="revenue" stroke="var(--accent)" fill="var(--accent-glow)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-title"><BarChart size={16}/>Revenue by City</div>
          <div className="chart-container">
            <ResponsiveContainer>
              <BarChart data={salesByCity} barSize={32}>
                <XAxis dataKey="city" tick={{fill:'var(--text-muted)', fontSize:11}} tickLine={false}/>
                <YAxis tick={{fill:'var(--text-muted)', fontSize:10}} tickFormatter={v=>`₹${(v/10000000).toFixed(1)}Cr`} tickLine={false} axisLine={false}/>
                <Tooltip formatter={(v)=>[fmtCurrency(v),'Revenue']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                <Bar dataKey="revenue" radius={[4,4,0,0]}>
                  {salesByCity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Yearly Revenue Trend</div>
          <div className="chart-container">
            <ResponsiveContainer>
              <LineChart data={revTrend}>
                <XAxis dataKey="year" tick={{fill:'var(--text-muted)', fontSize:11}} tickLine={false}/>
                <YAxis tick={{fill:'var(--text-muted)', fontSize:10}} tickFormatter={v=>`₹${(v/10000000).toFixed(0)}Cr`} tickLine={false} axisLine={false}/>
                <Tooltip formatter={(v)=>[fmtCurrency(v),'Revenue']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={{fill:'var(--accent)'}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Property Type Distribution</div>
          <div className="chart-container">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={propTypeDist} dataKey="count" nameKey="property_type" cx="50%" cy="50%" outerRadius={90} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                  {propTypeDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Analytics ─────────────────────────────────────────────────────────────────
function AnalyticsView() {
  const [topAgents, setTopAgents] = useState([]);
  const [rentVsSale, setRentVsSale] = useState([]);
  const [locality, setLocality] = useState([]);

  useEffect(() => {
    api.get('/admin/analytics/top-agents').then(r => setTopAgents(r.data));
    api.get('/admin/analytics/rent-vs-sale').then(r => setRentVsSale(r.data));
    api.get('/admin/analytics/locality-activity').then(r => setLocality(r.data));
  }, []);

  return (
    <div>
      <div className="card" style={{marginBottom:20}}>
        <div className="card-title">Top Agents by Revenue</div>
        <div style={{height:280}}>
          <ResponsiveContainer>
            <BarChart data={topAgents.slice(0,8)} barSize={28} layout="vertical">
              <XAxis type="number" tick={{fill:'var(--text-muted)',fontSize:10}} tickFormatter={v=>fmtCurrency(v)} tickLine={false} axisLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:'var(--text-secondary)',fontSize:12}} width={100} tickLine={false}/>
              <Tooltip formatter={(v)=>[fmtCurrency(v),'Revenue']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              <Bar dataKey="total_revenue" radius={[0,4,4,0]}>
                {topAgents.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Rent vs Sale Distribution</div>
          <div className="chart-container">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={rentVsSale} dataKey="count" nameKey="listing_type" cx="50%" cy="50%" outerRadius={90} label={({name,value})=>`${name}: ${value}`}>
                  {rentVsSale.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                </Pie>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                <Legend/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-title">Locality Activity</div>
          <div className="chart-container">
            <ResponsiveContainer>
              <BarChart data={locality} barSize={20}>
                <XAxis dataKey="locality_name" tick={{fill:'var(--text-muted)', fontSize:10}} tickLine={false}/>
                <YAxis tick={{fill:'var(--text-muted)', fontSize:10}} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
                <Bar name="Listings" dataKey="listings" fill="var(--accent)" radius={[4,4,0,0]}/>
                <Bar name="Properties" dataKey="properties" fill="#60a5fa" radius={[4,4,0,0]}/>
                <Legend/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:20}}>
        <div className="card-title">Agent Performance Summary</div>
        <DataTable
          columns={[
            {header:'Agent',     accessor:'name'},
            {header:'Total Deals', accessor:'total_deals'},
            {header:'Sale Deals',  accessor:'sale_deals'},
            {header:'Rent Deals',  accessor:'rent_deals'},
            {header:'Revenue',     accessor:'total_revenue', render:r=>fmtCurrency(r.total_revenue)},
          ]}
          data={topAgents}
          pageSize={10}
        />
      </div>
    </div>
  );
}

// ── Managers ─────────────────────────────────────────────────────────────────
function ManagersView() {
  const [managers, setManagers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({name:'',email:'',phone_number:'',aadhaarNo:'',hire_date:'',base_salary:'',password:''});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => api.get('/admin/managers').then(r => setManagers(r.data));
  useEffect(()=>{ load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.post('/admin/managers', {...form, base_salary: Number(form.base_salary)});
      setMsg('Manager added!'); setShowAdd(false); setForm({name:'',email:'',phone_number:'',aadhaarNo:'',hire_date:'',base_salary:'',password:''});
      load();
    } catch(ex){ setErr(ex.response?.data?.detail || 'Error'); }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Deactivate this manager?')) return;
    try { await api.delete(`/admin/managers/${id}`); load(); setMsg('Manager deactivated'); }
    catch(ex){ alert(ex.response?.data?.detail); }
  };

  return (
    <div>
      {msg && <div className="alert alert-success">{msg}</div>}
      <DataTable
        title="All Managers"
        columns={[
          {header:'Name',       accessor:'name'},
          {header:'Email',      accessor:'email'},
          {header:'Phone',      accessor:'phone_number'},
          {header:'Hire Date',  accessor:'hire_date', render:r=>fmtDate(r.hire_date)},
          {header:'Salary',     accessor:'base_salary', render:r=>fmtCurrency(r.base_salary)},
          {header:'Agents',     accessor:'agent_count'},
          {header:'Status',     accessor:'active_flag', render:r=>(
            <span className={`badge ${r.active_flag?'badge-success':'badge-muted'}`}>{r.active_flag?'Active':'Inactive'}</span>
          )},
          {header:'Actions', sortable:false, render:r=>(
            <div style={{display:'flex',gap:6}}>
              {r.active_flag ? (
                <button className="btn btn-danger btn-sm" onClick={()=>handleRemove(r.manager_id)}>
                  <Trash2 size={12}/> Deactivate
                </button>
              ) : (
                <button className="btn btn-success btn-sm" onClick={async ()=>{
                  try { await api.patch(`/admin/managers/${r.manager_id}/reactivate`); load(); setMsg('Manager reactivated'); }
                  catch(ex){ alert(ex.response?.data?.detail); }
                }}>
                  <CheckCircle size={12}/> Reactivate
                </button>
              )}
            </div>
          )},
        ]}
        data={managers}
        actions={<button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(true)}><Plus size={14}/>Add Manager</button>}
      />

      {showAdd && (
        <div className="modal-overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Add New Manager</div>
            {err && <div className="alert alert-error">{err}</div>}
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone_number} onChange={e=>setForm({...form,phone_number:e.target.value})} required/></div>
                <div className="form-group"><label className="form-label">Aadhaar (12 digits)</label><input className="form-input" maxLength={12} value={form.aadhaarNo} onChange={e=>setForm({...form,aadhaarNo:e.target.value})} required/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Hire Date</label><input className="form-input" type="date" value={form.hire_date} onChange={e=>setForm({...form,hire_date:e.target.value})} required/></div>
                <div className="form-group"><label className="form-label">Base Salary (₹)</label><input className="form-input" type="number" value={form.base_salary} onChange={e=>setForm({...form,base_salary:e.target.value})} required/></div>
              </div>
              <div className="form-group"><label className="form-label">Login Password</label><input className="form-input" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Manager</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Agents ────────────────────────────────────────────────────────────────────
function AgentsView() {
  const [agents, setAgents] = useState([]);
  const [managers, setManagers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({manager_id:'',name:'',phone:'',email:'',hire_date:'',base_salary:'',password:''});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    api.get('/admin/agents').then(r=>setAgents(r.data));
    api.get('/admin/managers').then(r=>setManagers(r.data.filter(m=>m.active_flag)));
  };
  useEffect(()=>{ load(); },[]);

  const handleRemove = async (id) => {
    if (!window.confirm('Deactivate this agent?')) return;
    try { await api.delete(`/admin/agents/${id}`); load(); setMsg('Agent deactivated'); }
    catch(ex){ alert(ex.response?.data?.detail); }
  };
  const handleReactivate = async (id) => {
    try { await api.patch(`/admin/agents/${id}/reactivate`); load(); setMsg('Agent reactivated'); }
    catch(ex){ alert(ex.response?.data?.detail); }
  };
  const handleAdd = async (e) => {
    e.preventDefault(); setErr('');
    try {
      await api.post('/admin/agents', {...form, base_salary: Number(form.base_salary)});
      setMsg('Agent added!'); setShowAdd(false);
      setForm({manager_id:'',name:'',phone:'',email:'',hire_date:'',base_salary:'',password:''});
      load();
    } catch(ex){ setErr(ex.response?.data?.detail || 'Error'); }
  };

  return (
    <div>
      {msg && <div className="alert alert-success">{msg}</div>}
      <DataTable
        title="All Agents"
        actions={<button className="btn btn-primary btn-sm" onClick={()=>{setShowAdd(true);setErr('');}}><Plus size={14}/>Add Agent</button>}
        columns={[
          {header:'Name',     accessor:'name'},
          {header:'Manager',  accessor:'manager_name'},
          {header:'Email',    accessor:'email'},
          {header:'Phone',    accessor:'phone'},
          {header:'Deals',    accessor:'total_deals'},
          {header:'Hire Date',accessor:'hire_date', render:r=>fmtDate(r.hire_date)},
          {header:'Salary',   accessor:'base_salary', render:r=>fmtCurrency(r.base_salary)},
          {header:'Status',   accessor:'active_flag', render:r=>(
            <span className={`badge ${r.active_flag?'badge-success':'badge-muted'}`}>{r.active_flag?'Active':'Inactive'}</span>
          )},
          {header:'Actions', sortable:false, render:r=>(
            <div style={{display:'flex',gap:6}}>
              {r.active_flag ? (
                <button className="btn btn-danger btn-sm" onClick={()=>handleRemove(r.agent_id)}>
                  <Trash2 size={12}/> Deactivate
                </button>
              ) : (
                <button className="btn btn-success btn-sm" onClick={()=>handleReactivate(r.agent_id)}>
                  <CheckCircle size={12}/> Reactivate
                </button>
              )}
            </div>
          )},
        ]}
        data={agents}
      />
      {showAdd && (
        <div className="modal-overlay" onClick={()=>setShowAdd(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Add New Agent</div>
            {err && <div className="alert alert-error">{err}</div>}
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">Assign to Manager</label>
                <select className="form-select" value={form.manager_id} onChange={e=>setForm({...form,manager_id:e.target.value})} required>
                  <option value="">Select manager…</option>
                  {managers.map(m=><option key={m.manager_id} value={m.manager_id}>{m.name}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} required/></div>
                <div className="form-group"><label className="form-label">Hire Date</label><input className="form-input" type="date" value={form.hire_date} onChange={e=>setForm({...form,hire_date:e.target.value})} required/></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Base Salary (₹)</label><input className="form-input" type="number" value={form.base_salary} onChange={e=>setForm({...form,base_salary:e.target.value})} required/></div>
                <div className="form-group"><label className="form-label">Login Password</label><input className="form-input" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required/></div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Agent</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Clients ───────────────────────────────────────────────────────────────────
function ClientsView() {
  const [clients, setClients] = useState([]);
  useEffect(()=>{ api.get('/admin/clients').then(r=>setClients(r.data)); },[]);
  return (
    <DataTable
      title="All Clients"
      columns={[
        {header:'Name',         accessor:'name'},
        {header:'Email',        accessor:'email'},
        {header:'Phone',        accessor:'phone'},
        {header:'Properties',   accessor:'property_count'},
        {header:'Transactions', accessor:'transaction_count'},
      ]}
      data={clients}
    />
  );
}

// ── Listings ──────────────────────────────────────────────────────────────────
function ListingsView() {
  const [listings, setListings] = useState([]);
  useEffect(()=>{ api.get('/admin/listings').then(r=>setListings(r.data)); },[]);
  return (
    <DataTable
      title="All Listings"
      columns={[
        {header:'ID',        accessor:'listing_id'},
        {header:'Type',      accessor:'listing_type', render:r=><span className={`badge ${r.listing_type==='RENT'?'badge-info':'badge-accent'}`}>{r.listing_type}</span>},
        {header:'Property',  accessor:'property_type'},
        {header:'City',      accessor:'city'},
        {header:'Locality',  accessor:'locality_name'},
        {header:'Bedrooms',  accessor:'bedrooms'},
        {header:'Rent Price',accessor:'price_rent',  render:r=>fmtCurrency(r.price_rent)},
        {header:'Sale Price',accessor:'price_sell',  render:r=>fmtCurrency(r.price_sell)},
        {header:'Status',    accessor:'status', render:r=>{
          const c={ACTIVE:'badge-success',SOLD:'badge-muted',RENTED:'badge-info',WITHDRAWN:'badge-danger'};
          return <span className={`badge ${c[r.status]||'badge-muted'}`}>{r.status}</span>;
        }},
        {header:'Owner',     accessor:'owner_name'},
        {header:'List Date', accessor:'list_date', render:r=>fmtDate(r.list_date)},
      ]}
      data={listings}
    />
  );
}

// ── Transactions ──────────────────────────────────────────────────────────────
function TransactionsView() {
  const [txns, setTxns] = useState([]);
  useEffect(()=>{ api.get('/admin/transactions').then(r=>setTxns(r.data)); },[]);
  return (
    <DataTable
      title="All Transactions"
      columns={[
        {header:'ID',       accessor:'transaction_id'},
        {header:'Date',     accessor:'sell_date', render:r=>fmtDate(r.sell_date)},
        {header:'Type',     accessor:'listing_type', render:r=><span className={`badge ${r.listing_type==='RENT'?'badge-info':'badge-accent'}`}>{r.listing_type}</span>},
        {header:'Buyer',    accessor:'buyer_name'},
        {header:'Seller',   accessor:'seller_name'},
        {header:'Agent',    accessor:'agent_name'},
        {header:'City',     accessor:'city'},
        {header:'Amount',   accessor:'sold_price', render:r=>r.sold_price ? fmtCurrency(r.sold_price) : (r.rent_amount ? `${fmtCurrency(r.rent_amount)}/mo` : '—')},
      ]}
      data={txns}
    />
  );
}

// ── SQL Console ────────────────────────────────────────────────────────────────
function SQLConsoleView() {
  const [query, setQuery] = useState('SELECT * FROM PROPERTY LIMIT 10');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setErr(''); setResult(null); setLoading(true);
    try {
      const { data } = await api.post('/admin/run-query', { query });
      setResult(data);
    } catch(ex){ setErr(ex.response?.data?.detail || 'Query failed'); }
    finally { setLoading(false); }
  };

  const cols = result?.rows?.[0] ? Object.keys(result.rows[0]) : [];

  return (
    <div>
      <div className="card" style={{marginBottom:20}}>
        <div className="card-title"><Database size={16}/> SQL Console</div>
        <p style={{fontSize:'0.82rem', color:'var(--text-muted)', marginBottom:12}}>
          Only SELECT / WITH / SHOW queries are permitted.
        </p>
        <textarea
          className="form-textarea"
          value={query}
          onChange={e=>setQuery(e.target.value)}
          rows={5}
          style={{fontFamily:'monospace', fontSize:'0.85rem'}}
        />
        <div style={{marginTop:10, display:'flex', gap:10, alignItems:'center'}}>
          <button className="btn btn-primary" onClick={run} disabled={loading}>
            <PlayCircle size={15}/> {loading ? 'Running…' : 'Run Query'}
          </button>
          {result && <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>Returned {result.count} rows</span>}
        </div>
      </div>

      {err && <div className="alert alert-error"><AlertCircle size={14}/>{err}</div>}

      {result?.rows?.length > 0 && (
        <div className="query-result-table">
          <table>
            <thead>
              <tr>{cols.map(c=><th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i}>{cols.map(c=><td key={c}>{row[c] == null ? '—' : String(row[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Academic Queries ───────────────────────────────────────────────────────────
function QueriesView() {
  const [results, setResults] = useState({});
  const [active, setActive] = useState(null);
  const [params, setParams] = useState({ locality:'G.S.Road', year_d:2023, year_e:2018 });

  const runQuery = async (key, endpoint) => {
    setActive(key);
    try {
      const { data } = await api.get(endpoint);
      setResults(r=>({...r, [key]: data}));
    } catch(ex){ setResults(r=>({...r, [key]: []})); }
  };

  const queries = [
    { key:'a', label:'(a) Houses for Rent built after 2023',       endpoint:'/admin/queries/a' },
    { key:'b', label:'(b) Houses priced ₹20L – ₹60L',             endpoint:'/admin/queries/b' },
    { key:'c', label:`(c) Properties in ${params.locality}`,       endpoint:`/admin/queries/c?locality=${params.locality}` },
    { key:'d', label:`(d) Top Agent in ${params.year_d} by Revenue`, endpoint:`/admin/queries/d?year=${params.year_d}` },
    { key:'e', label:`(e) Avg Selling Price by Agent (${params.year_e})`, endpoint:`/admin/queries/e?year=${params.year_e}` },
    { key:'f', label:'(f) Most Expensive Sale + Highest Rent',     endpoint:'/admin/queries/f' },
  ];

  const resultData = active ? (results[active] || []) : [];
  const cols = resultData[0] ? Object.keys(resultData[0]) : [];

  return (
    <div>
      <div className="card" style={{marginBottom:20}}>
        <div className="card-title">Query Parameters</div>
        <div className="form-row" style={{maxWidth:500}}>
          <div className="form-group">
            <label className="form-label">Locality (for Query C)</label>
            <input className="form-input" value={params.locality} onChange={e=>setParams({...params, locality:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Year (for Query D)</label>
            <input className="form-input" type="number" value={params.year_d} onChange={e=>setParams({...params, year_d:e.target.value})}/>
          </div>
          <div className="form-group">
            <label className="form-label">Year (for Query E)</label>
            <input className="form-input" type="number" value={params.year_e} onChange={e=>setParams({...params, year_e:e.target.value})}/>
          </div>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12, marginBottom:20}}>
        {queries.map(q=>(
          <button
            key={q.key}
            className={`btn ${active===q.key?'btn-primary':'btn-secondary'}`}
            style={{justifyContent:'flex-start', textAlign:'left', padding:'12px 16px'}}
            onClick={()=>runQuery(q.key, q.endpoint)}
          >
            {q.label}
          </button>
        ))}
      </div>

      {active && (
        <div className="table-container">
          <div className="table-header">
            <span className="table-title">Results: {queries.find(q=>q.key===active)?.label}</span>
            <span style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{resultData.length} row(s)</span>
          </div>
          {resultData.length === 0 ? (
            <div className="empty-state"><p>No results found for this query.</p></div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table>
                <thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {resultData.map((row,i)=>(
                    <tr key={i}>{cols.map(c=><td key={c}>{row[c]==null?'—':String(row[c])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
const views = {
  dashboard:    { title:'Dashboard',    sub:'System overview and analytics', Component: DashboardView },
  analytics:    { title:'Analytics',    sub:'Detailed performance analytics', Component: AnalyticsView },
  managers:     { title:'Managers',     sub:'Manage all managers',  Component: ManagersView },
  agents:       { title:'Agents',       sub:'Manage all agents',    Component: AgentsView },
  clients:      { title:'Clients',      sub:'View all clients',     Component: ClientsView },
  listings:     { title:'Listings',     sub:'All property listings',Component: ListingsView },
  transactions: { title:'Transactions', sub:'All transactions',     Component: TransactionsView },
  sql:          { title:'SQL Console',  sub:'Run custom SQL queries',Component: SQLConsoleView },
  queries:      { title:'Academic Queries', sub:'Required queries (a–f)',  Component: QueriesView },
};

export default function AdminDashboard() {
  const [active, setActive] = useState('dashboard');
  const view = views[active] || views.dashboard;
  const { Component } = view;

  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActive}/>
      <div className="main-content">
        <div className="topbar">
          <span className="topbar-title">Admin Panel — EstateHub</span>
        </div>
        <div className="page">
          <div className="page-header">
            <h1>{view.title}</h1>
            <p>{view.sub}</p>
          </div>
          <Component/>
        </div>
      </div>
    </div>
  );
}

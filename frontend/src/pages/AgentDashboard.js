import React, { useState, useEffect } from 'react';
import Sidebar from '../components/shared/Sidebar';
import DataTable from '../components/shared/DataTable';
import api, { fmtCurrency, fmtDate, fmtDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { CalendarCheck, TrendingUp, DollarSign, Target, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { validatePrice } from '../utils/validators';

function StatCard({ icon:Icon, label, value, color='var(--accent)' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{background:`${color}22`,color}}><Icon size={18}/></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function DashboardView({ agentId }) {
  const [perf, setPerf] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(()=>{
    if(!agentId) return;
    api.get(`/agent/profile/${agentId}`).then(r=>setProfile(r.data));
    api.get(`/agent/performance/${agentId}`).then(r=>setPerf(r.data));
  },[agentId]);

  if(!perf || !profile) return <div className="loading"><div className="spinner"/>Loading…</div>;
  const s = perf.summary;

  return (
    <div>
      <div className="stats-grid">
        <StatCard icon={CalendarCheck} label="Total Appointments" value={s.total_appointments||0}/>
        <StatCard icon={CheckCircle}   label="Successful Deals"   value={s.successful_deals||0} color="#4ade80"/>
        <StatCard icon={Target}        label="Conversion Rate"     value={`${s.conversion_rate||0}%`} color="#60a5fa"/>
        <StatCard icon={DollarSign}    label="Total Revenue"       value={fmtCurrency(s.total_revenue)} color="#fbbf24"/>
      </div>

      <div className="card" style={{marginBottom:20}}>
        <div className="card-title"><TrendingUp size={16}/>Monthly Revenue</div>
        <div style={{height:240}}>
          <ResponsiveContainer>
            <LineChart data={perf.monthly}>
              <XAxis dataKey="month" tick={{fill:'var(--text-muted)',fontSize:11}} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} tickFormatter={v=>fmtCurrency(v)} tickLine={false} axisLine={false}/>
              <Tooltip formatter={v=>[fmtCurrency(v),'Revenue']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={{fill:'var(--accent)'}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Agent Profile</div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, fontSize:'0.88rem'}}>
          {[['Name', profile.name],['Email', profile.email],['Phone', profile.phone],
            ['Manager', profile.manager_name],['Hire Date', fmtDate(profile.hire_date)],
            ['Base Salary', fmtCurrency(profile.base_salary)],
          ].map(([k,v])=>(
            <div key={k} style={{padding:'10px 14px', background:'var(--bg-secondary)', borderRadius:8}}>
              <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginBottom:2}}>{k}</div>
              <div style={{color:'var(--text-primary)',fontWeight:500}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AppointmentsView({ agentId }) {
  const [apts, setApts] = useState([]);
  const [filter, setFilter] = useState('upcoming');
  const [dealModal, setDealModal] = useState(null);
  const [dealForm, setDealForm] = useState({ deal_type:'SALE', sold_price:'', rent_amount:'', security_deposit:'', rent_end_date:'' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = () => {
    if(agentId) api.get(`/agent/appointments/${agentId}?status=${filter}`).then(r=>setApts(r.data));
  };
  useEffect(load, [agentId, filter]);

  const handleCloseDeal = async (e) => {
    e.preventDefault(); setErr('');
    // Client-side validation
    if (dealForm.deal_type === 'SALE') {
      if (!dealForm.sold_price || Number(dealForm.sold_price) <= 0) {
        setErr('Sale price must be a positive number.'); return;
      }
    } else {
      if (!dealForm.rent_amount || Number(dealForm.rent_amount) <= 0) {
        setErr('Monthly rent must be a positive number.'); return;
      }
      if (!dealForm.rent_end_date) {
        setErr('Rent end date is required.'); return;
      }
      const today = new Date().toISOString().split('T')[0];
      if (dealForm.rent_end_date <= today) {
        setErr('Rent end date must be in the future.'); return;
      }
    }
    try {
      await api.post('/agent/close-deal', {
        appointment_id: dealModal.appointment_id,
        deal_type: dealForm.deal_type,
        sold_price: dealForm.sold_price ? Number(dealForm.sold_price) : null,
        rent_amount: dealForm.rent_amount ? Number(dealForm.rent_amount) : null,
        security_deposit: dealForm.security_deposit ? Number(dealForm.security_deposit) : 0,
        rent_end_date: dealForm.rent_end_date || null,
      });
      setMsg('Deal closed successfully!');
      setDealModal(null);
      load();
    } catch(ex){ setErr(ex.response?.data?.detail || 'Error'); }
  };

  return (
    <div>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div style={{marginBottom:16, display:'flex', gap:4}}>
        {['upcoming','pending','done','all'].map(f=>(
          <button key={f} className={`tab${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      <DataTable
        title="My Appointments"
        columns={[
          {header:'Buyer',       accessor:'buyer_name'},
          {header:'Phone',       accessor:'buyer_phone'},
          {header:'Location',    render:r=>`${r.house_no}, ${r.street}, ${r.city}`},
          {header:'Type',        accessor:'listing_type', render:r=><span className={`badge ${r.listing_type==='RENT'?'badge-info':'badge-accent'}`}>{r.listing_type}</span>},
          {header:'Price',       render:r=>r.listing_type==='RENT'?`${fmtCurrency(r.price_rent)}/mo`:fmtCurrency(r.price_sell)},
          {header:'Bedrooms',    accessor:'bedrooms'},
          {header:'Scheduled',   accessor:'schedule_date_time', render:r=>fmtDateTime(r.schedule_date_time)},
          {header:'Status',      accessor:'deal_status', render:r=>(
            <span className={`badge ${r.deal_status?'badge-success':'badge-warning'}`}>{r.deal_status?'Closed':'Open'}</span>
          )},
          {header:'Actions', sortable:false, render:r=> !r.deal_status && (
            <button className="btn btn-success btn-sm" onClick={()=>{
              setDealModal(r);
              setDealForm({deal_type:r.listing_type==='RENT'?'RENT':'SALE', sold_price:'',rent_amount:'',security_deposit:'',rent_end_date:''});
              setErr('');
            }}>
              <CheckCircle size={12}/> Close Deal
            </button>
          )},
        ]}
        data={apts}
      />

      {dealModal && (
        <div className="modal-overlay" onClick={()=>setDealModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Close Deal</div>
            <p style={{fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:16}}>
              Buyer: <strong>{dealModal.buyer_name}</strong> — Property: {dealModal.house_no}, {dealModal.city}
            </p>
            {err && <div className="alert alert-error"><AlertCircle size={14}/>{err}</div>}
            <form onSubmit={handleCloseDeal}>
              <div className="form-group">
                <label className="form-label">Deal Type</label>
                <select className="form-select" value={dealForm.deal_type} onChange={e=>setDealForm({...dealForm,deal_type:e.target.value})}>
                  <option value="SALE">Sale</option>
                  <option value="RENT">Rent</option>
                </select>
              </div>
              {dealForm.deal_type === 'SALE' ? (
                <div className="form-group">
                  <label className="form-label">Sale Price (₹)</label>
                  <input className="form-input" type="number" value={dealForm.sold_price} onChange={e=>setDealForm({...dealForm,sold_price:e.target.value})} required/>
                </div>
              ) : (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Monthly Rent (₹)</label>
                      <input className="form-input" type="number" value={dealForm.rent_amount} onChange={e=>setDealForm({...dealForm,rent_amount:e.target.value})} required/>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Security Deposit (₹)</label>
                      <input className="form-input" type="number" value={dealForm.security_deposit} onChange={e=>setDealForm({...dealForm,security_deposit:e.target.value})}/>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rent Agreement End Date</label>
                    <input className="form-input" type="date" value={dealForm.rent_end_date} onChange={e=>setDealForm({...dealForm,rent_end_date:e.target.value})} required/>
                  </div>
                </>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={()=>setDealModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><CheckCircle size={14}/>Confirm Deal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ListingsView() {
  const [listings, setListings] = useState([]);
  useEffect(()=>{ api.get('/manager/listings').then(r=>setListings(r.data)); },[]);
  return (
    <DataTable
      title="All Active Listings"
      columns={[
        {header:'Type',      accessor:'listing_type', render:r=><span className={`badge ${r.listing_type==='RENT'?'badge-info':'badge-accent'}`}>{r.listing_type}</span>},
        {header:'Property',  accessor:'property_type'},
        {header:'City',      accessor:'city'},
        {header:'Locality',  accessor:'locality_name'},
        {header:'Bedrooms',  accessor:'bedrooms'},
        {header:'Rent/mo',   accessor:'price_rent',  render:r=>fmtCurrency(r.price_rent)},
        {header:'Sale Price',accessor:'price_sell',  render:r=>fmtCurrency(r.price_sell)},
        {header:'Status',    accessor:'status', render:r=>{
          const c={ACTIVE:'badge-success',SOLD:'badge-muted',RENTED:'badge-info',WITHDRAWN:'badge-danger'};
          return <span className={`badge ${c[r.status]||'badge-muted'}`}>{r.status}</span>;
        }},
        {header:'Owner',     accessor:'owner_name'},
      ]}
      data={listings}
    />
  );
}

function PerformanceView({ agentId }) {
  const [perf, setPerf] = useState(null);
  useEffect(()=>{ if(agentId) api.get(`/agent/performance/${agentId}`).then(r=>setPerf(r.data)); },[agentId]);
  if(!perf) return <div className="loading"><div className="spinner"/>Loading…</div>;
  return (
    <div>
      <div className="stats-grid">
        <StatCard icon={CalendarCheck} label="Total Appointments" value={perf.summary.total_appointments||0}/>
        <StatCard icon={CheckCircle}   label="Deals Closed"       value={perf.summary.successful_deals||0} color="#4ade80"/>
        <StatCard icon={Target}        label="Conversion Rate"     value={`${perf.summary.conversion_rate||0}%`} color="#60a5fa"/>
        <StatCard icon={DollarSign}    label="Total Revenue"       value={fmtCurrency(perf.summary.total_revenue)} color="#fbbf24"/>
      </div>
      <div className="card">
        <div className="card-title">Monthly Performance</div>
        <div style={{height:260}}>
          <ResponsiveContainer>
            <LineChart data={perf.monthly}>
              <XAxis dataKey="month" tick={{fill:'var(--text-muted)',fontSize:11}} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} tickFormatter={v=>fmtCurrency(v)} tickLine={false} axisLine={false}/>
              <Tooltip formatter={v=>[fmtCurrency(v),'Revenue']} contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8}}/>
              <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={{fill:'var(--accent)'}}/>
              <Line type="monotone" dataKey="deals" stroke="#60a5fa" strokeWidth={2} dot={{fill:'#60a5fa'}} yAxisId="right"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const views = {
  dashboard:    { title:'Dashboard',    sub:'Your performance overview', Component: DashboardView },
  performance:  { title:'Performance',  sub:'Detailed stats',           Component: PerformanceView },
  appointments: { title:'Appointments', sub:'Your assigned appointments',Component: AppointmentsView },
  listings:     { title:'Listings',     sub:'All active listings',       Component: ListingsView },
};

export default function AgentDashboard() {
  const { user } = useAuth();
  const [active, setActive] = useState('dashboard');
  const view = views[active] || views.dashboard;
  const { Component } = view;

  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActive}/>
      <div className="main-content">
        <div className="topbar">
          <span className="topbar-title">Agent Panel — {user?.name}</span>
        </div>
        <div className="page">
          <div className="page-header">
            <h1>{view.title}</h1>
            <p>{view.sub}</p>
          </div>
          <Component agentId={user?.id}/>
        </div>
      </div>
    </div>
  );
}

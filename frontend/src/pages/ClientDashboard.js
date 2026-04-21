import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/shared/Sidebar';
import DataTable from '../components/shared/DataTable';
import PropertyDetailModal from '../components/shared/PropertyDetailModal';
import api, { fmtCurrency, fmtDate, fmtDateTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  Home, Building2, MapPin, Bed, Bath, Layers,
  Plus, CalendarCheck, CheckCircle, AlertCircle, Eye, Tag
} from 'lucide-react';
import {
  validatePincode, validateBuildYear, validateSizeSqft, validatePrice
} from '../utils/validators';

function StatCard({ icon: Icon, label, value, color = 'var(--accent)' }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}22`, color }}><Icon size={18} /></div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

// ── Dashboard Overview ────────────────────────────────────────────────────────
function DashboardView({ clientId }) {
  const [props, setProps] = useState([]);
  const [apts, setApts] = useState([]);
  const [txns, setTxns] = useState([]);

  useEffect(() => {
    if (!clientId) return;
    api.get(`/client/properties/${clientId}`).then(r => setProps(r.data)).catch(() => {});
    api.get(`/client/appointments/${clientId}`).then(r => setApts(r.data)).catch(() => {});
    api.get(`/client/transactions/${clientId}`).then(r => setTxns(r.data)).catch(() => {});
  }, [clientId]);

  // Owned properties (registered under this client)
  const ownedProps = new Set(props.map(p => p.property_id));

  // Properties bought by this client (buyer in transactions) — add to "my properties" display
  const purchasedProps = txns.filter(t =>
    t.buyer_client_id === clientId && t.listing_type === 'SALE'
  );

  // Active listings on owned props
  const activeListings = props.filter(p => p.listing_status === 'ACTIVE').length;

  return (
    <div>
      <div className="stats-grid">
        <StatCard icon={Home} label="My Properties" value={ownedProps.size + purchasedProps.length} />
        <StatCard icon={Building2} label="Active Listings" value={activeListings} color="#4ade80" />
        <StatCard icon={CalendarCheck} label="Appointments" value={apts.length} color="#60a5fa" />
        <StatCard icon={CheckCircle} label="Deals Completed" value={txns.length} color="#fbbf24" />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title"><CalendarCheck size={16} /> Recent Appointments</div>
        {apts.length === 0 ? (
          <div className="empty-state"><CalendarCheck size={32} /><p>No appointments yet. Browse listings to book one!</p></div>
        ) : apts.slice(0, 5).map(a => (
          <div key={a.appointment_id} style={{
            padding: '12px 16px', marginBottom: 8,
            background: 'var(--bg-secondary)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                {a.house_no}, {a.street}, {a.city}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Agent: {a.agent_name} · {fmtDateTime(a.schedule_date_time)}
              </div>
            </div>
            <span className={`badge ${a.deal_status ? 'badge-success' : 'badge-warning'}`}>
              {a.deal_status ? 'Closed' : 'Open'}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Recent Transactions</div>
        {txns.length === 0 ? (
          <div className="empty-state"><p>No transactions yet.</p></div>
        ) : txns.slice(0, 4).map(t => (
          <div key={t.transaction_id} style={{
            padding: '12px 16px', marginBottom: 8,
            background: 'var(--bg-secondary)', borderRadius: 8,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                {t.city} · {t.listing_type}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {fmtDate(t.sell_date)} · Agent: {t.agent_name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--accent)', fontWeight: 700 }}>
                {t.sold_price ? fmtCurrency(t.sold_price) : t.rent_amount ? `${fmtCurrency(t.rent_amount)}/mo` : '—'}
              </div>
              <span className={`badge ${t.buyer_client_id === clientId ? 'badge-info' : 'badge-accent'}`} style={{ fontSize: '0.65rem' }}>
                {t.buyer_client_id === clientId ? 'Buyer' : 'Seller'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── My Properties ─────────────────────────────────────────────────────────────
function MyPropertiesView({ clientId }) {
  const [props, setProps] = useState([]);
  const [txns, setTxns] = useState([]);
  const [localities, setLocalities] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showList, setShowList] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState('owned'); // 'owned' | 'purchased' | 'sold'

  const [form, setForm] = useState({
    property_type: 'House', size_sqft: '', build_year: '',
    locality_id: '', house_no: '', block_no: '', street: '',
    city: '', state: '', pincode: '',
    bedrooms: 2, bathrooms: 1, floors: 1, balcony: false, kitchen: true,
  });
  const [listForm, setListForm] = useState({ listing_type: 'SALE', price_sell: '', price_rent: '' });

  const load = useCallback(() => {
    if (clientId) {
      api.get(`/client/properties/${clientId}`).then(r => setProps(r.data)).catch(() => {});
      api.get(`/client/transactions/${clientId}`).then(r => setTxns(r.data)).catch(() => {});
    }
  }, [clientId]);

  useEffect(() => {
    load();
    api.get('/client/localities').then(r => setLocalities(r.data)).catch(() => {});
  }, [load]);

  // 1. Owned properties (registered by this client, not sold)
  const uniqueOwned = Object.values(
    props.reduce((acc, p) => {
      if (!acc[p.property_id]) acc[p.property_id] = p;
      return acc;
    }, {})
  );

  // Get IDs of properties this client has SOLD (seller in SALE transactions)
  const soldPropertyIds = new Set(
    txns
      .filter(t => t.seller_client_id === clientId && t.listing_type === 'SALE')
      .map(t => t.property_id).filter(Boolean)
  );

  // Filter: remove sold properties from owned list
  const ownedNotSold = uniqueOwned.filter(p => !soldPropertyIds.has(p.property_id));
  const soldProperties = uniqueOwned.filter(p => soldPropertyIds.has(p.property_id));

  // 2. Purchased properties (buyer in SALE transactions)
  const purchasedTxns = txns.filter(t =>
    t.buyer_client_id === clientId && t.listing_type === 'SALE'
  );

  const handleAddProperty = async (e) => {
    e.preventDefault(); setErr('');
    const sizeErr = validateSizeSqft(form.size_sqft);
    if (sizeErr) { setErr(sizeErr); return; }
    const yearErr = validateBuildYear(form.build_year);
    if (yearErr) { setErr(yearErr); return; }
    const pinErr = validatePincode(form.pincode);
    if (pinErr) { setErr(pinErr); return; }
    if (!form.locality_id) { setErr('Please select a locality.'); return; }
    if (!form.house_no.trim()) { setErr('House number is required.'); return; }
    if (!form.street.trim()) { setErr('Street is required.'); return; }
    if (!form.city.trim()) { setErr('City is required.'); return; }
    if (!form.state.trim()) { setErr('State is required.'); return; }
    try {
      await api.post('/client/properties', {
        ...form, owner_id: clientId,
        size_sqft: Number(form.size_sqft),
        build_year: Number(form.build_year),
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        floors: Number(form.floors),
      });
      setMsg('Property added successfully!');
      setShowAdd(false);
      setForm({ property_type: 'House', size_sqft: '', build_year: '', locality_id: '', house_no: '', block_no: '', street: '', city: '', state: '', pincode: '', bedrooms: 2, bathrooms: 1, floors: 1, balcony: false, kitchen: true });
      load();
    } catch (ex) { setErr(ex.response?.data?.detail || 'Error adding property'); }
  };

  const handleAddListing = async (e) => {
    e.preventDefault(); setErr('');
    if (['SALE', 'BOTH'].includes(listForm.listing_type)) {
      const e2 = validatePrice(listForm.price_sell, 'Sale price');
      if (e2) { setErr(e2); return; }
      if (!listForm.price_sell) { setErr('Sale price is required.'); return; }
    }
    if (['RENT', 'BOTH'].includes(listForm.listing_type)) {
      const e2 = validatePrice(listForm.price_rent, 'Rent price');
      if (e2) { setErr(e2); return; }
      if (!listForm.price_rent) { setErr('Rent price is required.'); return; }
    }
    try {
      await api.post('/client/listings', {
        property_id: showList.property_id,
        listing_type: listForm.listing_type,
        price_sell: listForm.price_sell ? Number(listForm.price_sell) : null,
        price_rent: listForm.price_rent ? Number(listForm.price_rent) : null,
      });
      setMsg('Listing created!');
      setShowList(null);
      load();
    } catch (ex) { setErr(ex.response?.data?.detail || 'Error creating listing'); }
  };

  const renderPropertyCard = (p, mode = 'owned') => (
    <div key={p.property_id || p.transaction_id} className="property-card">
      <div className="property-img">
        <span style={{ fontSize: '2.5rem' }}>{(p.property_type || p.type) === 'House' ? '🏠' : '🏢'}</span>
        <div className="property-badge">
          {mode === 'purchased' ? (
            <span className="badge badge-success">Purchased</span>
          ) : mode === 'sold' ? (
            <span className="badge badge-muted">Sold</span>
          ) : p.listing_status ? (
            <span className={`badge ${p.listing_status === 'ACTIVE' ? 'badge-success' : p.listing_status === 'SOLD' ? 'badge-muted' : p.listing_status === 'RENTED' ? 'badge-info' : 'badge-warning'}`}>
              {p.listing_status}
            </span>
          ) : null}
        </div>
      </div>
      <div className="property-body">
        {mode === 'purchased' ? (
          <>
            <div className="property-price" style={{ color: '#4ade80' }}>{fmtCurrency(p.sold_price)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>paid</span></div>
            <div className="property-title">{p.property_type} in {p.city}</div>
            <div className="property-location"><MapPin size={11} /> {p.street}, {p.city}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Purchased on {fmtDate(p.sell_date)} · via Agent: {p.agent_name}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>✓ Ownership Transferred</span>
            </div>
          </>
        ) : mode === 'sold' ? (
          <>
            <div className="property-price" style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              {p.price_sell ? fmtCurrency(p.price_sell) : 'Sold'}
            </div>
            <div className="property-title">{p.property_type} · {p.size_sqft} sqft · Built {p.build_year}</div>
            <div className="property-location"><MapPin size={11} /> {p.street}, {p.city}</div>
            <div className="property-features">
              <div className="prop-feature"><Bed size={12} />{p.bedrooms} Beds</div>
              <div className="prop-feature"><Bath size={12} />{p.bathrooms} Baths</div>
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>Sold — Ownership Transferred</span>
            </div>
          </>
        ) : (
          <>
            <div className="property-price">
              {p.listing_type === 'RENT' ? `${fmtCurrency(p.price_rent)}/mo`
                : p.listing_type === 'SALE' || p.listing_type === 'BOTH' ? fmtCurrency(p.price_sell)
                : 'Not listed'}
            </div>
            <div className="property-title">{p.property_type} · {p.size_sqft} sqft · Built {p.build_year}</div>
            <div className="property-location"><MapPin size={11} /> {p.street}, {p.city}</div>
            <div className="property-features">
              <div className="prop-feature"><Bed size={12} />{p.bedrooms} Beds</div>
              <div className="prop-feature"><Bath size={12} />{p.bathrooms} Baths</div>
              <div className="prop-feature"><Layers size={12} />{p.floors} Floor{p.floors > 1 ? 's' : ''}</div>
            </div>
            {!p.listing_status && (
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', marginTop: 10, justifyContent: 'center' }}
                onClick={() => { setShowList(p); setListForm({ listing_type: 'SALE', price_sell: '', price_rent: '' }); setErr(''); }}
              >
                <Plus size={12} /> Create Listing
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {msg && <div className="alert alert-success">{msg}</div>}
      {err && !showAdd && !showList && <div className="alert alert-error">{err}</div>}

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button className={`tab${activeTab === 'owned' ? ' active' : ''}`} onClick={() => setActiveTab('owned')}>
            My Properties ({ownedNotSold.length})
          </button>
          <button className={`tab${activeTab === 'purchased' ? ' active' : ''}`} onClick={() => setActiveTab('purchased')}>
            Purchased ({purchasedTxns.length})
          </button>
          {soldProperties.length > 0 && (
            <button className={`tab${activeTab === 'sold' ? ' active' : ''}`} onClick={() => setActiveTab('sold')}>
              Sold ({soldProperties.length})
            </button>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setErr(''); }}>
          <Plus size={14} /> Add Property
        </button>
      </div>

      {/* Owned (not sold) */}
      {activeTab === 'owned' && (
        <div className="property-grid">
          {ownedNotSold.map(p => renderPropertyCard(p, 'owned'))}
          {ownedNotSold.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <Home size={40} /><p>No active properties. Add your first property!</p>
            </div>
          )}
        </div>
      )}

      {/* Purchased (bought via transactions) */}
      {activeTab === 'purchased' && (
        <div>
          {purchasedTxns.length > 0 && (
            <div className="alert" style={{ background: '#4ade8011', border: '1px solid #4ade8033', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#4ade80' }}>
              ✓ Properties you purchased are shown here. Ownership has been transferred to you.
            </div>
          )}
          <div className="property-grid">
            {purchasedTxns.map(t => renderPropertyCard(t, 'purchased'))}
            {purchasedTxns.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <Building2 size={40} /><p>No purchased properties yet. Browse listings to buy!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sold properties */}
      {activeTab === 'sold' && (
        <div>
          <div className="alert" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            These properties have been sold. Ownership has been transferred to the buyer.
          </div>
          <div className="property-grid">
            {soldProperties.map(p => renderPropertyCard(p, 'sold'))}
          </div>
        </div>
      )}

      {/* Add Property Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add New Property</div>
            {err && <div className="alert alert-error"><AlertCircle size={14} />{err}</div>}
            <form onSubmit={handleAddProperty}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Property Type</label>
                  <select className="form-select" value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })}>
                    <option>House</option>
                    <option>Apartment</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Size (sqft)</label>
                  <input className="form-input" type="number" min="1" value={form.size_sqft} onChange={e => setForm({ ...form, size_sqft: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Build Year</label>
                  <input className="form-input" type="number" min="1900" max="2025" value={form.build_year} onChange={e => setForm({ ...form, build_year: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Locality</label>
                  <select className="form-select" value={form.locality_id} onChange={e => setForm({ ...form, locality_id: e.target.value })} required>
                    <option value="">Select locality…</option>
                    {localities.map(l => <option key={l.locality_id} value={l.locality_id}>{l.locality_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">House No.</label>
                  <input className="form-input" value={form.house_no} onChange={e => setForm({ ...form, house_no: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Block No. (optional)</label>
                  <input className="form-input" value={form.block_no} onChange={e => setForm({ ...form, block_no: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Street</label>
                <input className="form-input" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input className="form-input" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bedrooms</label>
                  <input className="form-input" type="number" min="0" value={form.bedrooms} onChange={e => setForm({ ...form, bedrooms: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Bathrooms</label>
                  <input className="form-input" type="number" min="0" value={form.bathrooms} onChange={e => setForm({ ...form, bathrooms: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Floors</label>
                  <input className="form-input" type="number" min="1" value={form.floors} onChange={e => setForm({ ...form, floors: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Property</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Listing Modal */}
      {showList && (
        <div className="modal-overlay" onClick={() => setShowList(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Create Listing</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              {showList.property_type} at {showList.street}, {showList.city}
            </p>
            {err && <div className="alert alert-error"><AlertCircle size={14} />{err}</div>}
            <form onSubmit={handleAddListing}>
              <div className="form-group">
                <label className="form-label">Listing Type</label>
                <select className="form-select" value={listForm.listing_type} onChange={e => setListForm({ ...listForm, listing_type: e.target.value })}>
                  <option value="SALE">For Sale</option>
                  <option value="RENT">For Rent</option>
                  <option value="BOTH">Both Sale & Rent</option>
                </select>
              </div>
              {['SALE', 'BOTH'].includes(listForm.listing_type) && (
                <div className="form-group">
                  <label className="form-label">Sale Price (₹)</label>
                  <input className="form-input" type="number" min="1" value={listForm.price_sell} onChange={e => setListForm({ ...listForm, price_sell: e.target.value })} required={listForm.listing_type === 'SALE'} />
                </div>
              )}
              {['RENT', 'BOTH'].includes(listForm.listing_type) && (
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₹)</label>
                  <input className="form-input" type="number" min="1" value={listForm.price_rent} onChange={e => setListForm({ ...listForm, price_rent: e.target.value })} required={listForm.listing_type === 'RENT'} />
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowList(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Listing</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Browse Listings ───────────────────────────────────────────────────────────
function BrowseListingsView({ clientId }) {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [agents, setAgents] = useState([]);
  const [filters, setFilters] = useState({ city: '', listing_type: '', min_price: '', max_price: '', bedrooms: '', property_type: '', locality: '' });
  const [bookModal, setBookModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [bookForm, setBookForm] = useState({ agent_id: '', schedule_date_time: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const PAGE_SIZE = 9;

  const load = useCallback(async (pg = 1) => {
    const params = new URLSearchParams({ status: 'ACTIVE', page: pg, page_size: PAGE_SIZE });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    try {
      const { data } = await api.get(`/client/listings/browse?${params}`);
      setListings(data.listings);
      setTotal(data.total);
      setPage(pg);
    } catch { }
  }, [filters]);

  useEffect(() => { load(1); }, [load]);
  useEffect(() => { api.get('/client/agents').then(r => setAgents(r.data)).catch(() => {}); }, []);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleBook = async (e) => {
    e.preventDefault(); setErr('');
    const defaultDT = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
    try {
      await api.post('/client/appointments', {
        listing_id: bookModal.listing_id,
        agent_id: bookForm.agent_id,
        buyer_client_id: clientId,
        schedule_date_time: bookForm.schedule_date_time || defaultDT,
      });
      setMsg('Appointment booked! Check your Appointments tab.');
      setBookModal(null);
    } catch (ex) { setErr(ex.response?.data?.detail || 'Failed to book appointment'); }
  };

  const clearFilters = () => setFilters({ city: '', listing_type: '', min_price: '', max_price: '', bedrooms: '', property_type: '', locality: '' });

  return (
    <div>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
          <div>
            <label className="form-label">City</label>
            <select className="form-select" value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })}>
              <option value="">All Cities</option>
              <option value="Guwahati">Guwahati</option>
              <option value="Delhi">Delhi</option>
              <option value="Mumbai">Mumbai</option>
            </select>
          </div>
          <div>
            <label className="form-label">Listing Type</label>
            <select className="form-select" value={filters.listing_type} onChange={e => setFilters({ ...filters, listing_type: e.target.value })}>
              <option value="">All Types</option>
              <option value="SALE">For Sale</option>
              <option value="RENT">For Rent</option>
              <option value="BOTH">Both</option>
            </select>
          </div>
          <div>
            <label className="form-label">Property Type</label>
            <select className="form-select" value={filters.property_type} onChange={e => setFilters({ ...filters, property_type: e.target.value })}>
              <option value="">All</option>
              <option value="House">House</option>
              <option value="Apartment">Apartment</option>
            </select>
          </div>
          <div>
            <label className="form-label">Min Bedrooms</label>
            <select className="form-select" value={filters.bedrooms} onChange={e => setFilters({ ...filters, bedrooms: e.target.value })}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Min Price (₹)</label>
            <input className="form-input" type="number" placeholder="e.g. 500000" value={filters.min_price} onChange={e => setFilters({ ...filters, min_price: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Max Price (₹)</label>
            <input className="form-input" type="number" placeholder="e.g. 10000000" value={filters.max_price} onChange={e => setFilters({ ...filters, max_price: e.target.value })} />
          </div>
          <div>
            <label className="form-label">Locality</label>
            <input className="form-input" placeholder="e.g. Bandra" value={filters.locality} onChange={e => setFilters({ ...filters, locality: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        Showing {listings.length} of {total} active listings
      </div>

      <div className="property-grid">
        {listings.map(l => (
          <div key={l.listing_id} className="property-card">
            <div className="property-img" onClick={() => setDetailModal(l)} style={{ cursor: 'pointer' }}>
              <span style={{ fontSize: '2.5rem' }}>{l.property_type === 'House' ? '🏠' : '🏢'}</span>
              <div className="property-badge">
                <span className={`badge ${l.listing_type === 'RENT' ? 'badge-info' : l.listing_type === 'BOTH' ? 'badge-warning' : 'badge-accent'}`}>{l.listing_type}</span>
              </div>
            </div>
            <div className="property-body">
              <div className="property-price">
                {l.listing_type === 'RENT' ? `${fmtCurrency(l.price_rent)}/mo`
                  : l.listing_type === 'BOTH' ? `${fmtCurrency(l.price_sell)} | ${fmtCurrency(l.price_rent)}/mo`
                  : fmtCurrency(l.price_sell)}
              </div>
              <div className="property-title">{l.property_type} · {l.size_sqft} sqft · {l.build_year}</div>
              <div className="property-location"><MapPin size={11} /> {l.locality_name}, {l.city}</div>
              <div className="property-features">
                <div className="prop-feature"><Bed size={12} />{l.bedrooms}</div>
                <div className="prop-feature"><Bath size={12} />{l.bathrooms}</div>
                <div className="prop-feature"><Layers size={12} />{l.floors}F</div>
                {l.school ? <span title="School nearby">🏫</span> : null}
                {l.hospital ? <span title="Hospital nearby">🏥</span> : null}
                {l.park ? <span title="Park nearby">🌳</span> : null}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>Owner: {l.owner_name}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setDetailModal(l)}>
                  <Eye size={12} /> Details
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { setBookModal(l); setBookForm({ agent_id: '', schedule_date_time: '' }); setErr(''); }}
                  disabled={l.owner_id === clientId}
                >
                  {l.owner_id === clientId ? 'Yours' : <><CalendarCheck size={12} /> Book</>}
                </button>
              </div>
            </div>
          </div>
        ))}
        {listings.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <Building2 size={40} /><p>No listings match your filters.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 20 }}>
          <button className="page-btn" onClick={() => load(page - 1)} disabled={page === 1}>‹ Prev</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button className="page-btn" onClick={() => load(page + 1)} disabled={page === totalPages}>Next ›</button>
        </div>
      )}

      {detailModal && (
        <PropertyDetailModal
          listing={detailModal}
          clientId={clientId}
          onClose={() => setDetailModal(null)}
          onBook={(l) => { setDetailModal(null); setBookModal(l); setBookForm({ agent_id: '', schedule_date_time: '' }); setErr(''); }}
        />
      )}

      {bookModal && (
        <div className="modal-overlay" onClick={() => setBookModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Book Appointment</div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: '0.88rem' }}>
              <div style={{ fontWeight: 600 }}>{bookModal.property_type} in {bookModal.locality_name}, {bookModal.city}</div>
              <div style={{ color: 'var(--accent)', fontWeight: 700, marginTop: 4, fontSize: '1.1rem' }}>
                {bookModal.listing_type === 'RENT' ? `${fmtCurrency(bookModal.price_rent)}/mo` : fmtCurrency(bookModal.price_sell)}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                {bookModal.bedrooms} bed · {bookModal.bathrooms} bath · {bookModal.size_sqft} sqft
              </div>
            </div>
            {err && <div className="alert alert-error"><AlertCircle size={14} />{err}</div>}
            <form onSubmit={handleBook}>
              <div className="form-group">
                <label className="form-label">Select Agent *</label>
                <select className="form-select" value={bookForm.agent_id} onChange={e => setBookForm({ ...bookForm, agent_id: e.target.value })} required>
                  <option value="">Choose an agent…</option>
                  {agents.map(a => (
                    <option key={a.agent_id} value={a.agent_id}>{a.name} (Manager: {a.manager_name})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Preferred Date & Time</label>
                <input
                  className="form-input" type="datetime-local"
                  value={bookForm.schedule_date_time}
                  onChange={e => setBookForm({ ...bookForm, schedule_date_time: e.target.value })}
                  min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Leave blank to auto-schedule 2 days from now</small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setBookModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary"><CalendarCheck size={14} /> Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Appointments ──────────────────────────────────────────────────────────────
function AppointmentsView({ clientId }) {
  const [apts, setApts] = useState([]);
  useEffect(() => {
    if (clientId) api.get(`/client/appointments/${clientId}`).then(r => setApts(r.data)).catch(() => {});
  }, [clientId]);

  return (
    <DataTable
      title="My Appointments"
      columns={[
        { header: 'Property', render: r => `${r.house_no}, ${r.street}` },
        { header: 'City', accessor: 'city' },
        { header: 'Agent', accessor: 'agent_name' },
        { header: 'Agent Phone', accessor: 'agent_phone' },
        {
          header: 'Type', accessor: 'listing_type',
          render: r => <span className={`badge ${r.listing_type === 'RENT' ? 'badge-info' : 'badge-accent'}`}>{r.listing_type}</span>
        },
        { header: 'Price', render: r => r.listing_type === 'RENT' ? `${fmtCurrency(r.price_rent)}/mo` : fmtCurrency(r.price_sell) },
        { header: 'Beds', accessor: 'bedrooms' },
        { header: 'Scheduled', accessor: 'schedule_date_time', render: r => fmtDateTime(r.schedule_date_time) },
        {
          header: 'Status', accessor: 'deal_status',
          render: r => <span className={`badge ${r.deal_status ? 'badge-success' : 'badge-warning'}`}>{r.deal_status ? 'Deal Closed' : 'Pending'}</span>
        },
      ]}
      data={apts}
    />
  );
}

// ── Transactions ──────────────────────────────────────────────────────────────
function TransactionsView({ clientId }) {
  const [txns, setTxns] = useState([]);
  useEffect(() => {
    if (clientId) api.get(`/client/transactions/${clientId}`).then(r => setTxns(r.data)).catch(() => {});
  }, [clientId]);

  return (
    <DataTable
      title="My Transactions"
      columns={[
        { header: 'Date', accessor: 'sell_date', render: r => fmtDate(r.sell_date) },
        {
          header: 'Role', render: r => r.buyer_client_id === clientId
            ? <span className="badge badge-info">Buyer</span>
            : <span className="badge badge-accent">Seller</span>
        },
        {
          header: 'Type', accessor: 'listing_type',
          render: r => <span className={`badge ${r.listing_type === 'RENT' ? 'badge-info' : 'badge-accent'}`}>{r.listing_type}</span>
        },
        { header: 'Property', accessor: 'property_type' },
        { header: 'City', accessor: 'city' },
        { header: 'Agent', accessor: 'agent_name' },
        {
          header: 'Amount', render: r => r.sold_price
            ? fmtCurrency(r.sold_price)
            : r.rent_amount ? `${fmtCurrency(r.rent_amount)}/mo` : '—'
        },
        { header: 'Rent Until', accessor: 'rent_end', render: r => fmtDate(r.rent_end) },
        { header: 'Security Dep.', accessor: 'security_deposit', render: r => r.security_deposit ? fmtCurrency(r.security_deposit) : '—' },
      ]}
      data={txns}
    />
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
const views = {
  dashboard:    { title: 'Dashboard',       sub: 'Your activity overview',     Component: DashboardView },
  properties:   { title: 'My Properties',   sub: 'Manage your properties',     Component: MyPropertiesView },
  browse:       { title: 'Browse Listings', sub: 'Find your dream property',   Component: BrowseListingsView },
  appointments: { title: 'Appointments',    sub: 'Your property appointments', Component: AppointmentsView },
  transactions: { title: 'Transactions',    sub: 'Your deal history',          Component: TransactionsView },
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const [active, setActive] = useState('browse');
  const view = views[active] || views.browse;
  const { Component } = view;

  return (
    <div className="app-shell">
      <Sidebar active={active} onChange={setActive} />
      <div className="main-content">
        <div className="topbar">
          <span className="topbar-title">Client Portal — {user?.name}</span>
        </div>
        <div className="page">
          <div className="page-header">
            <h1>{view.title}</h1>
            <p>{view.sub}</p>
          </div>
          <Component clientId={user?.id} />
        </div>
      </div>
    </div>
  );
}

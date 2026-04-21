import React from 'react';
import { fmtCurrency, fmtDate } from '../../utils/api';
import { MapPin, Bed, Bath, Layers, X, School, Hospital } from 'lucide-react';

export default function PropertyDetailModal({ listing, onClose, onBook, clientId }) {
  if (!listing) return null;

  const amenities = [
    listing.school      && { icon: '🏫', label: 'School' },
    listing.hospital    && { icon: '🏥', label: 'Hospital' },
    listing.gym         && { icon: '🏋️', label: 'Gym' },
    listing.park        && { icon: '🌳', label: 'Park' },
    listing.swimming_pool && { icon: '🏊', label: 'Pool' },
  ].filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ margin: 0 }}>
              {listing.property_type} — {listing.city}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              <MapPin size={12} style={{ marginRight: 4 }} />
              {listing.house_no}, {listing.street}, {listing.locality_name}
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Price banner */}
        <div style={{
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent)',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            {(listing.listing_type === 'SALE' || listing.listing_type === 'BOTH') && listing.price_sell && (
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)' }}>
                {fmtCurrency(listing.price_sell)}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>sale</span>
              </div>
            )}
            {(listing.listing_type === 'RENT' || listing.listing_type === 'BOTH') && listing.price_rent && (
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--info)', fontFamily: 'var(--font-display)' }}>
                {fmtCurrency(listing.price_rent)}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mo</span>
              </div>
            )}
          </div>
          <span className={`badge ${listing.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`} style={{ fontSize: '0.8rem', padding: '5px 12px' }}>
            {listing.status}
          </span>
        </div>

        {/* Key stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Bedrooms',  value: listing.bedrooms,   icon: '🛏️' },
            { label: 'Bathrooms', value: listing.bathrooms,  icon: '🚿' },
            { label: 'Floors',    value: listing.floors,     icon: '🏗️' },
            { label: 'Size',      value: `${listing.size_sqft}sqft`, icon: '📐' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 6px' }}>
              <div style={{ fontSize: '1.2rem' }}>{s.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Details row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20, fontSize: '0.85rem' }}>
          {[
            ['Property Type', listing.property_type],
            ['Build Year',    listing.build_year],
            ['Pincode',       listing.pincode],
            ['State',         listing.state],
            ['Balcony',       listing.balcony ? 'Yes' : 'No'],
            ['Kitchen',       listing.kitchen ? 'Yes' : 'No'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v ?? '—'}</div>
            </div>
          ))}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 8 }}>NEARBY AMENITIES</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {amenities.map(a => (
                <span key={a.label} style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '4px 12px', fontSize: '0.8rem'
                }}>
                  {a.icon} {a.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Owner */}
        <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>Owner:</span>
          <strong>{listing.owner_name}</strong>
        </div>

        {/* Action */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          {onBook && listing.owner_id !== clientId && listing.status === 'ACTIVE' && (
            <button className="btn btn-primary" onClick={() => onBook(listing)}>
              📅 Book Appointment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import {
  validateName, validateEmail, validatePhone,
  validateAadhaar, validatePassword
} from '../utils/validators';

export default function RegisterPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '', phone: '', email: '', aadhaar_no: '', password: '', confirm: ''
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const f = (field) => ({
    value: form[field],
    onChange: (e) => {
      setForm({ ...form, [field]: e.target.value });
      setErrors({ ...errors, [field]: null });
    },
    className: `form-input${errors[field] ? ' input-error' : ''}`,
  });

  const validate = () => {
    const e = {};
    e.name      = validateName(form.name);
    e.email     = validateEmail(form.email);
    e.phone     = validatePhone(form.phone);
    e.aadhaar_no = validateAadhaar(form.aadhaar_no);
    e.password  = validatePassword(form.password);
    if (!form.confirm) e.confirm = "Please confirm your password.";
    else if (form.password !== form.confirm) e.confirm = "Passwords do not match.";
    setErrors(e);
    return !Object.values(e).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/auth/register/client', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        aadhaar_no: form.aadhaar_no.trim(),
        password: form.password,
      });
      setSuccess('Registration successful! Redirecting to login…');
      setTimeout(() => nav('/login'), 2000);
    } catch (err) {
      setApiError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-box" style={{ maxWidth: 460, width: '100%' }}>
        <div className="login-logo">
          <h1>EstateHub</h1>
          <p>Create your client account</p>
        </div>
        {apiError && <div className="alert alert-error">{apiError}</div>}
        {success  && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input {...f('name')} placeholder="e.g. Rahul Sharma" />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone (10 digits) *</label>
              <input {...f('phone')} placeholder="9876543210" maxLength={13} />
              {errors.phone && <div className="field-error">{errors.phone}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Aadhaar (12 digits) *</label>
              <input {...f('aadhaar_no')} placeholder="123456789012" maxLength={12} />
              {errors.aadhaar_no && <div className="field-error">{errors.aadhaar_no}</div>}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Gmail Address *</label>
            <input {...f('email')} type="email" placeholder="yourname@gmail.com" />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input {...f('password')} type="password" placeholder="Min 6 characters" />
              {errors.password && <div className="field-error">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input {...f('confirm')} type="password" placeholder="Re-enter password" />
              {errors.confirm && <div className="field-error">{errors.confirm}</div>}
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: 11 }}
            disabled={loading}
          >
            {loading ? 'Registering…' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

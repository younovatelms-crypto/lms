// src/pages/RegisterPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  register,
  selectIsAuthenticated,
  selectAuthStatus,
  selectAuthError,
  clearError,
} from '../features/auth/authSlice';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const dispatch        = useAppDispatch();
  const navigate        = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const status          = useAppSelector(selectAuthStatus);
  const error           = useAppSelector(selectAuthError);

  const [form, setForm]       = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'trainee' });
  const [showPw, setShowPw]   = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name)                            { toast.error('Name is required');                       return; }
    if (!form.email)                           { toast.error('Email is required');                      return; }
    if (!emailRe.test(form.email))             { toast.error('Enter a valid email address');            return; }
    if (!form.password)                        { toast.error('Password is required');                   return; }
    if (form.password.length < 6)              { toast.error('Password must be at least 6 characters'); return; }
    if (!form.confirmPassword)                 { toast.error('Please confirm your password');           return; }
    if (form.password !== form.confirmPassword){ toast.error('Passwords do not match');                 return; }

    const result = await dispatch(register({
      name:     form.name,
      email:    form.email,
      password: form.password,
      role:     form.role,
    }));

    if (register.fulfilled.match(result)) {
      toast.success('Account created! Please sign in.');
      navigate('/login', { replace: true });
    }
  };

  const isLoading = status === 'loading';

  return (
    <>
      <style>{CSS}</style>

      <div className="yn-page">
        <div className="yn-card" role="main" aria-label="Register">

          {/* Brand */}
          <div className="yn-brand">
            <div className="yn-logo" aria-hidden="true">Y</div>
            <h1 className="yn-title">Create account</h1>
            <p className="yn-subtitle">Join Younovate and start learning</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

            <div className="yn-field">
              <label htmlFor="name" className="yn-label">Full Name</label>
              <div className="yn-input-wrap">
                <i className="ti ti-user yn-icon" aria-hidden="true" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  autoComplete="name"
                  disabled={isLoading}
                  className="yn-input"
                  required
                />
              </div>
            </div>

            <div className="yn-field">
              <label htmlFor="email" className="yn-label">Email address</label>
              <div className="yn-input-wrap">
                <i className="ti ti-mail yn-icon" aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  className="yn-input"
                  required
                />
              </div>
            </div>

            <div className="yn-field">
              <label htmlFor="role" className="yn-label">Role</label>
              <div className="yn-input-wrap">
                <i className="ti ti-shield yn-icon" aria-hidden="true" />
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="yn-input yn-select"
                >
                  <option value="trainee">Trainee</option>
                  <option value="trainer">Trainer</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="yn-field">
              <label htmlFor="password" className="yn-label">Password</label>
              <div className="yn-input-wrap">
                <i className="ti ti-lock yn-icon" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="yn-input"
                  required
                />
                <button
                  type="button"
                  className="yn-eye"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <i className={`ti ${showPw ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="yn-field">
              <label htmlFor="confirmPassword" className="yn-label">Confirm Password</label>
              <div className="yn-input-wrap">
                <i className="ti ti-lock-check yn-icon" aria-hidden="true" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showCpw ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  className="yn-input"
                  required
                />
                <button
                  type="button"
                  className="yn-eye"
                  onClick={() => setShowCpw(v => !v)}
                  aria-label={showCpw ? 'Hide password' : 'Show password'}
                >
                  <i className={`ti ${showCpw ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="yn-btn-primary"
              disabled={isLoading}
            >
              {isLoading
                ? <><span className="yn-spinner" /><span>Creating account…</span></>
                : 'Create Account'
              }
            </button>

          </form>

          {/* Login link */}
          <p className="yn-signup">
            Already have an account?{' '}
            <button
              type="button"
              className="yn-signup-link"
              onClick={() => navigate('/login')}
            >
              Sign in
            </button>
          </p>

        </div>
      </div>
    </>
  );
}

// ── All styles — identical design tokens as LoginPage ─────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .yn-page {
    min-height: 100vh;
    background: #0A0F1E;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    padding: 16px;
  }

  .yn-card {
    width: 100%;
    max-width: 400px;
    background: #111827;
    border: 1px solid #1e2a3f;
    border-radius: 24px;
    padding: 40px 32px 36px;
  }

  .yn-brand { text-align: center; margin-bottom: 32px; }

  .yn-logo {
    width: 56px; height: 56px;
    border-radius: 16px;
    background: #6366f1;
    display: flex; align-items: center; justify-content: center;
    font-size: 24px; font-weight: 800; color: #fff;
    margin: 0 auto 14px;
    letter-spacing: -1px;
  }

  .yn-title    { font-size: 22px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.4px; margin-bottom: 4px; }
  .yn-subtitle { font-size: 13px; color: #64748b; }

  .yn-field  { margin-bottom: 16px; }

  .yn-label {
    display: block;
    font-size: 11px; font-weight: 600;
    color: #64748b;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    margin-bottom: 7px;
  }

  .yn-input-wrap { position: relative; display: flex; align-items: center; }

  .yn-icon {
    position: absolute; left: 14px;
    color: #475569; font-size: 16px;
    pointer-events: none; line-height: 1;
  }

  .yn-input {
    width: 100%;
    padding: 13px 44px 13px 42px;
    background: #1a2235;
    border: 1.5px solid #1e2a3f;
    border-radius: 12px;
    font-size: 14px; color: #f1f5f9;
    font-family: inherit; outline: none;
    transition: border-color 0.2s;
    -webkit-appearance: none;
  }
  .yn-input::placeholder { color: #374151; }
  .yn-input:focus        { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
  .yn-input:disabled     { opacity: 0.5; }

  .yn-select {
    padding-right: 14px;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
  }
  .yn-select option { background: #1a2235; color: #f1f5f9; }

  .yn-eye {
    position: absolute; right: 13px;
    background: none; border: none;
    color: #475569; cursor: pointer;
    padding: 4px; font-size: 16px;
    line-height: 1; display: flex; align-items: center;
  }
  .yn-eye:hover { color: #94a3b8; }

  .yn-btn-primary {
    width: 100%;
    padding: 14px;
    background: #6366f1; color: #fff;
    border: none; border-radius: 12px;
    font-size: 15px; font-weight: 600;
    cursor: pointer; font-family: inherit;
    letter-spacing: -0.2px;
    margin-bottom: 20px;
    transition: background 0.2s, opacity 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 50px;
  }
  .yn-btn-primary:hover:not(:disabled)  { background: #5558e8; }
  .yn-btn-primary:active:not(:disabled) { background: #4f46e5; }
  .yn-btn-primary:disabled              { opacity: 0.6; cursor: not-allowed; }

  .yn-spinner {
    width: 17px; height: 17px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: yn-spin 0.65s linear infinite;
    flex-shrink: 0;
  }
  @keyframes yn-spin { to { transform: rotate(360deg); } }

  .yn-signup { text-align: center; font-size: 13px; color: #475569; }

  .yn-signup-link {
    color: #6366f1; background: none; border: none;
    cursor: pointer; font-family: inherit;
    font-size: 13px; font-weight: 600; padding: 0;
  }
  .yn-signup-link:hover { color: #818cf8; }

  @media (max-width: 440px) {
    .yn-page { padding: 0; align-items: flex-start; }
    .yn-card {
      max-width: 100%; border-radius: 0; border: none;
      min-height: 100vh; padding: 56px 24px 40px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .yn-spinner { animation: none; border-top-color: #fff; }
    .yn-btn-primary { transition: none; }
  }
`;

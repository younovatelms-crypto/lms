// src/pages/LoginPage.jsx
// Younovate LMS — Mobile-first Login Page
// Clean UI · Google OAuth · No demo credentials · Fully responsive

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  login,
  selectIsAuthenticated,
  selectUserRole,
  selectAuthStatus,
  selectAuthError,
  clearError,
} from '../features/auth/authSlice';
import toast from 'react-hot-toast';

const ROLE_REDIRECT = {
  admin:   '/admin/dashboard',
  trainer: '/trainer/dashboard',
  trainee: '/trainee/dashboard',
  hr:      '/hr/dashboard',
};

export default function LoginPage() {
  const dispatch        = useAppDispatch();
  const navigate        = useNavigate();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role            = useAppSelector(selectUserRole);
  const status          = useAppSelector(selectAuthStatus);
  const error           = useAppSelector(selectAuthError);

  const [form, setForm]         = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw]     = useState(false);

  // Already authenticated → redirect by role
  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(ROLE_REDIRECT[role] || '/', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  // Show Redux error as toast
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
    if (!form.email)               { toast.error('Email is required');           return; }
    if (!emailRe.test(form.email)) { toast.error('Enter a valid email address'); return; }
    if (!form.password)            { toast.error('Password is required');        return; }

    const result = await dispatch(login({ ...form, remember }));
    if (login.fulfilled.match(result)) {
      toast.success('Welcome back!');
    }
  };

  const handleForgotPassword = () => {
    if (!form.email) {
      toast.error('Enter your email first, then tap Forgot password');
      return;
    }
    // dispatch(forgotPassword(form.email))  ← wire your thunk here
    toast.success('Reset link sent to your email');
  };

  // Google OAuth — redirects to backend passport/google route.
  // Backend handles code exchange and issues JWT on callback URL.
  const handleGoogle = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`;
  };

  const isLoading = status === 'loading';

  return (
    <>
      <style>{CSS}</style>

      <div className="yn-page">
        <div className="yn-card" role="main" aria-label="Login">

          {/* Brand */}
          <div className="yn-brand">
            <div className="yn-logo" aria-hidden="true">Y</div>
            <h1 className="yn-title">Welcome back</h1>
            <p className="yn-subtitle">Sign in to your Younovate account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

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
                  autoComplete="current-password"
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

            <div className="yn-row">
              <label className="yn-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <button
                type="button"
                className="yn-forgot"
                 onClick={() => navigate('/forgot_password')}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              className="yn-btn-primary"
              disabled={isLoading}
            >
              {isLoading
                ? <><span className="yn-spinner" /><span>Signing in…</span></>
                : 'Sign In'
              }
            </button>

          </form>

          {/* Divider */}
          <div className="yn-divider" role="separator">
            <span className="yn-divider-line" />
            <span className="yn-divider-text">or continue with</span>
            <span className="yn-divider-line" />
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            className="yn-btn-google"
            onClick={handleGoogle}
            disabled={isLoading}
            aria-label="Continue with Google"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Sign up */}
          <p className="yn-signup">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              className="yn-signup-link"
              onClick={() => navigate('/register')}
            >
              Sign up
            </button>
          </p>

        </div>
      </div>
    </>
  );
}

// ── Google G icon (inline SVG — no external fetch) ────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ── All styles in one constant ────────────────────────────────────────────────
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

  /* Brand */
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

  .yn-title  { font-size: 22px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.4px; margin-bottom: 4px; }
  .yn-subtitle { font-size: 13px; color: #64748b; }

  /* Fields */
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

  .yn-eye {
    position: absolute; right: 13px;
    background: none; border: none;
    color: #475569; cursor: pointer;
    padding: 4px; font-size: 16px;
    line-height: 1; display: flex; align-items: center;
  }
  .yn-eye:hover { color: #94a3b8; }

  /* Remember / forgot */
  .yn-row {
    display: flex; align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
  }

  .yn-remember {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: #64748b;
    cursor: pointer; user-select: none;
  }
  .yn-remember input { accent-color: #6366f1; width: 15px; height: 15px; cursor: pointer; }

  .yn-forgot {
    font-size: 13px; color: #6366f1;
    background: none; border: none;
    cursor: pointer; font-family: inherit;
    padding: 0; font-weight: 500;
  }
  .yn-forgot:hover { color: #818cf8; }

  /* Primary button */
  .yn-btn-primary {
    width: 100%;
    padding: 14px;
    background: #6366f1; color: #fff;
    border: none; border-radius: 12px;
    font-size: 15px; font-weight: 600;
    cursor: pointer; font-family: inherit;
    letter-spacing: -0.2px;
    margin-bottom: 16px;
    transition: background 0.2s, opacity 0.2s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    min-height: 50px;
  }
  .yn-btn-primary:hover:not(:disabled) { background: #5558e8; }
  .yn-btn-primary:active:not(:disabled){ background: #4f46e5; }
  .yn-btn-primary:disabled             { opacity: 0.6; cursor: not-allowed; }

  /* Spinner */
  .yn-spinner {
    width: 17px; height: 17px;
    border: 2.5px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: yn-spin 0.65s linear infinite;
    flex-shrink: 0;
  }
  @keyframes yn-spin { to { transform: rotate(360deg); } }

  /* Divider */
  .yn-divider {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 16px;
  }
  .yn-divider-line { flex: 1; height: 1px; background: #1e2a3f; }
  .yn-divider-text { font-size: 11px; color: #374151; white-space: nowrap; }

  /* Google button */
  .yn-btn-google {
    width: 100%;
    padding: 13px;
    background: #fff; color: #111827;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: inherit;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    margin-bottom: 24px;
    transition: background 0.15s;
    min-height: 50px;
  }
  .yn-btn-google:hover:not(:disabled)  { background: #f8faff; }
  .yn-btn-google:active:not(:disabled) { background: #eff2ff; }
  .yn-btn-google:disabled              { opacity: 0.6; cursor: not-allowed; }

  /* Sign up row */
  .yn-signup { text-align: center; font-size: 13px; color: #475569; }

  .yn-signup-link {
    color: #6366f1; background: none; border: none;
    cursor: pointer; font-family: inherit;
    font-size: 13px; font-weight: 600; padding: 0;
  }
  .yn-signup-link:hover { color: #818cf8; }

  /* ── Mobile: full-screen card ── */
  @media (max-width: 440px) {
    .yn-page { padding: 0; align-items: flex-start; }
    .yn-card {
      max-width: 100%; border-radius: 0; border: none;
      min-height: 100vh; padding: 56px 24px 40px;
    }
  }

  /* ── Reduce motion ── */
  @media (prefers-reduced-motion: reduce) {
    .yn-spinner { animation: none; border-top-color: #fff; }
    .yn-btn-primary, .yn-btn-google { transition: none; }
  }
`;
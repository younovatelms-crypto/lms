// src/pages/ForgotPasswordPage.jsx
// Youva OS — Forgot Password (4-step flow)
// Step 1: Email  →  Step 2: OTP  →  Step 3: New Password  →  Step 4: Success
// Mobile-first · Fully responsive · Matches LoginPage design system


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  forgotPassword,
  verifyOtp,
  resetPassword,
  selectAuthStatus,
  selectAuthError,
  clearError,
} from '../features/auth/authSlice';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_LENGTH   = 6;
const TIMER_SECS   = 299; // 4 min 59 sec
const MIN_PW_LEN   = 8;

const STEPS = {
  EMAIL:    1,
  OTP:      2,
  PASSWORD: 3,
  SUCCESS:  4,
};

// ─── Password strength helper ─────────────────────────────────────────────────
function getStrength(pw) {
  let score = 0;
  if (pw.length >= MIN_PW_LEN)    score++;
  if (/[A-Z]/.test(pw))           score++;
  if (/[0-9]/.test(pw))           score++;
  if (/[^A-Za-z0-9]/.test(pw))    score++;
  return [
    { pct: 0,   color: '#1e2a3f', label: '',        textColor: '#475569' },
    { pct: 25,  color: '#ef4444', label: 'Weak',     textColor: '#f87171' },
    { pct: 50,  color: '#f97316', label: 'Fair',     textColor: '#fb923c' },
    { pct: 75,  color: '#eab308', label: 'Good',     textColor: '#facc15' },
    { pct: 100, color: '#22c55e', label: 'Strong',   textColor: '#4ade80' },
  ][score];
}

// ─── OTP Input Component ──────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const inputRefs = useRef([]);

  // Initialize refs array
  if (inputRefs.current.length !== OTP_LENGTH) {
    inputRefs.current = Array.from({ length: OTP_LENGTH }, () => null);
  }

  const handleChange = (idx, e) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const next  = value.split('');
    next[idx]   = digit;
    const joined = next.join('');
    onChange(joined);
    if (digit && idx < OTP_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    onChange(text.padEnd(OTP_LENGTH, ''));
    inputRefs.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
  };

  return (
    <div style={s.otpRow} role="group" aria-label="One-time password">
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={el => inputRefs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          style={{
            ...s.otpBox,
            borderColor: value[i] ? '#7ba8d6' : '#d7e0eb',
            color:        value[i] ? '#1f3d63' : '#050a16',
          }}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Countdown Timer Hook ─────────────────────────────────────────────────────
function useCountdown(active, onExpire) {
  const [secs, setSecs] = useState(TIMER_SECS);

  useEffect(() => {
    if (!active) return;
    setSecs(TIMER_SECS);
    const id = setInterval(() => {
      setSecs(s => {
        if (s <= 1) { clearInterval(id); onExpire?.(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return { display: `${mm}:${ss}`, expired: secs === 0 };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const status   = useAppSelector(selectAuthStatus);
  const error    = useAppSelector(selectAuthError);

  const [step,       setStep]       = useState(STEPS.EMAIL);
  const [email,      setEmail]      = useState('');
  const [emailErr,   setEmailErr]   = useState('');
  const [otp,        setOtp]        = useState('');
  const [otpErr,     setOtpErr]     = useState('');
  const [timerKey,   setTimerKey]   = useState(0);   // bump to restart timer
  const [timerOn,    setTimerOn]    = useState(false);
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwErr,      setPwErr]      = useState('');
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);

  const { display: timerDisplay, expired } = useCountdown(timerOn, () => setTimerOn(false));
  const isLoading = status === 'loading';
  const strength  = getStrength(newPw);

  // Show Redux errors
  useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  // ── Step navigation ──────────────────────────────────────────────────────
  const goBack = () => {
    if (step === STEPS.OTP)      { setStep(STEPS.EMAIL); setTimerOn(false); }
    if (step === STEPS.PASSWORD) setStep(STEPS.OTP);
  };

  // ── Step 1: Send OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    setEmailErr('');
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email)               { setEmailErr('Email is required');           return; }
    if (!emailRe.test(email)) { setEmailErr('Enter a valid email address'); return; }

    const result = await dispatch(forgotPassword(email));
    if (forgotPassword.fulfilled.match(result)) {
      setOtp('');
      setOtpErr('');
      setTimerOn(true);
      setTimerKey(k => k + 1);
      setStep(STEPS.OTP);
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    setOtpErr('');
    if (otp.length < OTP_LENGTH) { setOtpErr('Enter the complete 6-digit code'); return; }

    const result = await dispatch(verifyOtp({ email, otp }));
    if (verifyOtp.fulfilled.match(result)) {
      setTimerOn(false);
      setNewPw('');
      setConfirmPw('');
      setPwErr('');
      setStep(STEPS.PASSWORD);
    }
  };

  const handleResend = async () => {
    setOtp('');
    setOtpErr('');
    await dispatch(forgotPassword(email));
    setTimerOn(true);
    setTimerKey(k => k + 1);
  };

  // ── Step 3: Reset Password ────────────────────────────────────────────────
  const handleResetPassword = async () => {
    setPwErr('');
    if (!newPw)               { setPwErr('Enter a new password');                        return; }
    if (newPw.length < MIN_PW_LEN) { setPwErr(`Password must be at least ${MIN_PW_LEN} characters`); return; }
    if (!/[0-9]/.test(newPw)) { setPwErr('Password must include at least one number');  return; }
    if (newPw !== confirmPw)  { setPwErr('Passwords do not match');                      return; }

    const result = await dispatch(resetPassword({ email, otp, newPassword: newPw }));
    if (resetPassword.fulfilled.match(result)) {
      setStep(STEPS.SUCCESS);
    }
  };

  // ── Progress bar widths ───────────────────────────────────────────────────
  const progressFill = (n) => step >= n ? '#1f3d63' : '#dbe3ed';

  return (
    <>
      <style>{CSS}</style>

      <div className="fp-page">
        <div className="fp-card" role="main" aria-label="Password recovery">

          {/* Progress dots */}
          <div className="fp-progress" aria-hidden="true">
            {[1, 2, 3].map(n => (
              <div key={n} className="fp-progress-bar" style={{ background: progressFill(n) }} />
            ))}
          </div>

          {/* Back button */}
          {step !== STEPS.EMAIL && step !== STEPS.SUCCESS && (
            <button className="fp-back" onClick={goBack} aria-label="Go back">
              <i className="ti ti-arrow-left" aria-hidden="true" />
              Back
            </button>
          )}

          {/* ── STEP 1 — Email ── */}
          {step === STEPS.EMAIL && (
            <div className="fp-step">
              <div className="fp-icon-wrap" aria-hidden="true">
                <i className="ti ti-mail" style={{ fontSize: 28 }} />
              </div>
              <h1 className="fp-title">Forgot password?</h1>
              <p className="fp-sub">
                Enter your registered email and we'll send a 6-digit verification code.
              </p>

              <label htmlFor="fp-email" className="fp-label">Email address</label>
              <div className="fp-input-wrap">
                <i className="ti ti-mail fp-input-icon" aria-hidden="true" />
                <input
                  id="fp-email"
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isLoading}
                  className={`fp-input${emailErr ? ' fp-input-err' : ''}`}
                  aria-describedby={emailErr ? 'email-err-msg' : undefined}
                  aria-invalid={!!emailErr}
                />
              </div>
              {emailErr && (
                <p id="email-err-msg" className="fp-err-msg" role="alert">{emailErr}</p>
              )}

              <button
                className="fp-btn-primary"
                onClick={handleSendOtp}
                disabled={isLoading}
              >
                {isLoading
                  ? <><span className="fp-spinner" /><span>Sending…</span></>
                  : <><i className="ti ti-send" aria-hidden="true" />Send OTP</>
                }
              </button>

              <p className="fp-back-login">
                Remember your password?{' '}
                <button className="fp-link-btn" onClick={() => navigate('/login')}>
                  Sign in
                </button>
              </p>
            </div>
          )}

          {/* ── STEP 2 — OTP ── */}
          {step === STEPS.OTP && (
            <div className="fp-step">
              <div className="fp-icon-wrap" aria-hidden="true">
                <i className="ti ti-device-mobile" style={{ fontSize: 28 }} />
              </div>
              <h1 className="fp-title">Check your email</h1>
              <p className="fp-sub">
                We sent a 6-digit code to<br />
                <strong style={{ color: '#94a3b8' }}>{email}</strong>
              </p>

              <OtpInput key={timerKey} value={otp} onChange={setOtp} />

              {otpErr && (
                <p className="fp-err-msg" role="alert">{otpErr}</p>
              )}

              <div className="fp-timer-row">
                <span className="fp-timer">
                  Expires in{' '}
                  <strong style={{ color: expired ? '#ef4444' : '#94a3b8' }}>
                    {timerDisplay}
                  </strong>
                </span>
                <button
                  className="fp-resend-btn"
                  onClick={handleResend}
                  disabled={!expired || isLoading}
                  aria-label="Resend verification code"
                >
                  Resend code
                </button>
              </div>

              <button
                className="fp-btn-primary"
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length < OTP_LENGTH}
              >
                {isLoading
                  ? <><span className="fp-spinner" /><span>Verifying…</span></>
                  : 'Verify Code'
                }
              </button>

              <button
                className="fp-btn-ghost"
                onClick={goBack}
                disabled={isLoading}
              >
                Change email address
              </button>
            </div>
          )}

          {/* ── STEP 3 — New Password ── */}
          {step === STEPS.PASSWORD && (
            <div className="fp-step">
              <div className="fp-icon-wrap" aria-hidden="true">
                <i className="ti ti-lock" style={{ fontSize: 28 }} />
              </div>
              <h1 className="fp-title">Create new password</h1>
              <p className="fp-sub">
                Must be at least {MIN_PW_LEN} characters and include a number.
              </p>

              {/* New password */}
              <label htmlFor="fp-new-pw" className="fp-label">New password</label>
              <div className="fp-input-wrap">
                <i className="ti ti-lock fp-input-icon" aria-hidden="true" />
                <input
                  id="fp-new-pw"
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setPwErr(''); }}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="fp-input fp-input-pw"
                />
                <button
                  type="button"
                  className="fp-eye"
                  onClick={() => setShowNew(v => !v)}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                >
                  <i className={`ti ${showNew ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                </button>
              </div>

              {/* Strength bar */}
              <div className="fp-strength-track" aria-hidden="true">
                <div
                  className="fp-strength-fill"
                  style={{ width: `${strength.pct}%`, background: strength.color }}
                />
              </div>
              {newPw && (
                <p className="fp-strength-label" style={{ color: strength.textColor }}>
                  {strength.label}
                </p>
              )}

              {/* Confirm password */}
              <label htmlFor="fp-conf-pw" className="fp-label">Confirm password</label>
              <div className="fp-input-wrap">
                <i className="ti ti-lock fp-input-icon" aria-hidden="true" />
                <input
                  id="fp-conf-pw"
                  type={showConf ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setPwErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className={`fp-input fp-input-pw${pwErr ? ' fp-input-err' : ''}`}
                  aria-invalid={!!pwErr}
                />
                <button
                  type="button"
                  className="fp-eye"
                  onClick={() => setShowConf(v => !v)}
                  aria-label={showConf ? 'Hide password' : 'Show password'}
                >
                  <i className={`ti ${showConf ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true" />
                </button>
              </div>

              {pwErr && (
                <p className="fp-err-msg" role="alert">{pwErr}</p>
              )}

              <button
                className="fp-btn-primary"
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading
                  ? <><span className="fp-spinner" /><span>Resetting…</span></>
                  : 'Reset password'
                }
              </button>
            </div>
          )}

          {/* ── STEP 4 — Success ── */}
          {step === STEPS.SUCCESS && (
            <div className="fp-step" style={{ alignItems: 'center' }}>
              <div className="fp-success-icon" aria-hidden="true">
                <i className="ti ti-check" style={{ fontSize: 34 }} />
              </div>
              <h1 className="fp-title" style={{ marginTop: 20 }}>Password reset!</h1>
              <p className="fp-sub" style={{ marginBottom: 32 }}>
                Your password has been updated. You can now sign in with your new password.
              </p>
              <button
                className="fp-btn-primary"
                onClick={() => navigate('/login')}
                style={{ maxWidth: 320 }}
              >
                <i className="ti ti-arrow-left" aria-hidden="true" />
                Back to sign in
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .fp-page {
    min-height: 100vh;
    background: linear-gradient(115deg, #1f3d63 0%, #315f83 58%, #4b8eaa 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Public Sans', system-ui, -apple-system, sans-serif;
    padding: 16px;
  }

  .fp-card {
    width: 100%;
    max-width: 476px;
    background: #ffffff;
    border: 1px solid rgba(255,255,255,0.72);
    border-radius: 18px;
    padding: 34px 50px 44px;
    box-shadow: 0 26px 70px rgba(20,46,75,0.28);
  }

  /* Progress */
  .fp-progress {
    display: flex;
    gap: 6px;
    margin-bottom: 4px;
  }
  .fp-progress-bar {
    flex: 1;
    height: 3px;
    border-radius: 3px;
    transition: background 0.3s;
  }

  /* Back button */
  .fp-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: #2f6f9b;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    padding: 10px 0 0;
    margin-bottom: 4px;
  }
  .fp-back:hover { color: #1f3d63; }

  /* Step wrapper */
  .fp-step {
    display: flex;
    flex-direction: column;
  }

  /* Icon */
  .fp-icon-wrap {
    width: 64px;
    height: 64px;
    border-radius: 20px;
    background: #eef5fb;
    border: 1px solid #d7e0eb;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1f3d63;
    margin: 20px auto 0;
  }

  /* Headings */
  .fp-title {
    font-size: 20px;
    font-weight: 700;
    color: #1f3d63;
    text-align: center;
    margin-top: 16px;
    letter-spacing: -0.3px;
  }
  .fp-sub {
    font-size: 13px;
    color: #536987;
    text-align: center;
    margin-top: 6px;
    line-height: 1.6;
    margin-bottom: 28px;
  }

  /* Labels */
  .fp-label {
    display: block;
    font-size: 14px;
    font-weight: 700;
    color: #536987;
    letter-spacing: 0;
    text-transform: none;
    margin-bottom: 7px;
  }

  /* Input */
  .fp-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 14px;
  }
  .fp-input-icon {
    position: absolute;
    left: 14px;
    color: #7a8ba4;
    font-size: 16px;
    pointer-events: none;
    line-height: 1;
  }
  .fp-input {
    width: 100%;
    padding: 13px 14px 13px 42px;
    background: #ffffff;
    border: 1px solid #d7e0eb;
    border-radius: 8px;
    font-size: 14px;
    color: #050a16;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    -webkit-appearance: none;
  }
  .fp-input::placeholder  { color: #9aa9bb; }
  .fp-input:focus         { border-color: #7ba8d6; box-shadow: 0 0 0 3px rgba(63,125,160,.16); }
  .fp-input:disabled      { opacity: 0.5; }
  .fp-input-err           { border-color: #ef4444 !important; }
  .fp-input-pw            { padding-right: 44px; }

  /* Eye toggle */
  .fp-eye {
    position: absolute;
    right: 13px;
    background: none;
    border: none;
    color: #7a8ba4;
    cursor: pointer;
    padding: 4px;
    font-size: 16px;
    line-height: 1;
    display: flex;
    align-items: center;
  }
  .fp-eye:hover { color: #1f3d63; }

  /* Error message */
  .fp-err-msg {
    font-size: 12px;
    color: #f87171;
    margin: -8px 0 12px 2px;
  }

  /* OTP */
  .fp-otp-row {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-bottom: 6px;
  }
  .fp-otp-box {
    width: 44px;
    height: 52px;
    background: #ffffff;
    border: 1px solid #d7e0eb;
    border-radius: 8px;
    font-size: 22px;
    font-weight: 700;
    text-align: center;
    outline: none;
    font-family: inherit;
    -webkit-appearance: none;
    caret-color: #1f3d63;
    transition: border-color 0.15s;
  }
  .fp-otp-box:focus { box-shadow: 0 0 0 3px rgba(63,125,160,.16); }

  /* Timer row */
  .fp-timer-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  .fp-timer { font-size: 13px; color: #657691; }

  .fp-resend-btn {
    font-size: 13px;
    color: #2f6f9b;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-weight: 600;
    padding: 0;
    transition: color 0.2s;
  }
  .fp-resend-btn:disabled { color: #9aa9bb; cursor: not-allowed; }
  .fp-resend-btn:not(:disabled):hover { color: #1f3d63; }

  /* Strength bar */
  .fp-strength-track {
    height: 4px;
    background: #dbe3ed;
    border-radius: 4px;
    margin: -8px 0 4px;
    overflow: hidden;
  }
  .fp-strength-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s, background 0.3s;
  }
  .fp-strength-label {
    font-size: 11px;
    text-align: right;
    margin-bottom: 14px;
    font-weight: 600;
  }

  /* Primary button */
  .fp-btn-primary {
    width: 100%;
    padding: 14px;
    background: #1f3d63;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: -0.2px;
    margin-bottom: 10px;
    transition: background 0.2s, opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 50px;
  }
  .fp-btn-primary:hover:not(:disabled)  { background: #294c76; }
  .fp-btn-primary:active:not(:disabled) { background: #173254; }
  .fp-btn-primary:disabled              { opacity: 0.6; cursor: not-allowed; }

  /* Ghost button */
  .fp-btn-ghost {
    width: 100%;
    padding: 13px;
    background: transparent;
    color: #2f6f9b;
    border: 1px solid #d7e0eb;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s;
    min-height: 48px;
  }
  .fp-btn-ghost:hover:not(:disabled) { background: #eef5fb; }
  .fp-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Spinner */
  .fp-spinner {
    width: 17px;
    height: 17px;
    border: 2.5px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: fp-spin 0.65s linear infinite;
    flex-shrink: 0;
  }
  @keyframes fp-spin { to { transform: rotate(360deg); } }

  /* Success icon */
  .fp-success-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: #052e16;
    border: 1.5px solid #166534;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #22c55e;
    margin: 28px auto 0;
  }

  /* Sign-in link row */
  .fp-back-login {
    text-align: center;
    font-size: 13px;
    color: #657691;
    margin-top: 4px;
  }
  .fp-link-btn {
    color: #2f6f9b;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    padding: 0;
  }
  .fp-link-btn:hover { color: #1f3d63; }

  /* ── Mobile: full-screen ── */
  @media (max-width: 440px) {
    .fp-page {
      padding: 0;
      align-items: flex-start;
    }
    .fp-card {
      max-width: 100%;
      border-radius: 0;
      border: none;
      min-height: 100vh;
      padding: 48px 24px 40px;
    }
  }

  /* ── Reduce motion ── */
  @media (prefers-reduced-motion: reduce) {
    .fp-spinner               { animation: none; border-top-color: #fff; }
    .fp-strength-fill,
    .fp-progress-bar,
    .fp-input,
    .fp-btn-primary,
    .fp-btn-ghost             { transition: none; }
  }
`;

// OTP box style object (used inline in OtpInput)
const s = {
  otpRow: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 6,
  },
  otpBox: {
    width: 44,
    height: 52,
    background: '#ffffff',
    border: '1px solid',
    borderRadius: 8,
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'center',
    outline: 'none',
    fontFamily: 'inherit',
    WebkitAppearance: 'none',
    caretColor: '#1f3d63',
    transition: 'border-color 0.15s',
  },
};

import { useRef, useState } from 'react';
import './App.css';
import { useAuth } from './auth/AuthProvider';

/* ─── Login page ──────────────────────────────────────────────── */
function LoginPage() {
  const { loginWithMagicLink, verifyMagicLink } = useAuth();

  const [step, setStep]       = useState('email'); // 'email' | 'otp'
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');
  const otpRefs               = useRef([]);

  /* Send magic-link code ---------------------------------------- */
  const handleSend = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await loginWithMagicLink(email.trim());
      setInfo('A 6-digit code has been sent to your inbox.');
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* OTP input auto-advance -------------------------------------- */
  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      otpRefs.current[5]?.focus();
      e.preventDefault();
    }
  };

  /* Verify code ------------------------------------------------- */
  const handleVerify = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return; }
    setLoading(true);
    try {
      await verifyMagicLink(email.trim(), code);
      // AuthProvider updates user → App re-renders dashboard automatically
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => { setStep('email'); setOtp(['','','','','','']); setError(''); setInfo(''); };

  return (
    <div className="login-bg">
      {/* Animated blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="login-card">
        {/* Brand header */}
        <div className="login-brand">
          <div className="login-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.4C16.6 22.15 20 17.25 20 12V6l-8-4z"
                fill="url(#shield-grad)" />
              <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="shield-grad" x1="4" y1="2" x2="20" y2="23"
                  gradientUnits="userSpaceOnUse">
                  <stop stopColor="#c084fc" />
                  <stop offset="1" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <h1 className="login-title">Chautari Admin</h1>
          <p className="login-subtitle">
            {step === 'email'
              ? 'Sign in to continue to your dashboard'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* Step indicator */}
        <div className="login-steps" aria-label="Login steps">
          <span className={`login-step-dot ${step === 'email' ? 'active' : 'done'}`} />
          <span className="login-step-line" />
          <span className={`login-step-dot ${step === 'otp' ? 'active' : ''}`} />
        </div>

        {/* ── STEP 1: Email ── */}
        {step === 'email' && (
          <form className="login-form" onSubmit={handleSend} noValidate>
            <div className="login-field">
              <label htmlFor="login-email" className="login-label">Email address</label>
              <div className="login-input-wrap">
                <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24"
                  fill="none" aria-hidden="true">
                  <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"
                    stroke="currentColor" strokeWidth="1.8" />
                  <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8"
                    strokeLinecap="round" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  className="login-input"
                  placeholder="admin@chautari.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}
            {info  && <p className="login-info"  role="status">{info}</p>}

            <button id="btn-send-magic-link" type="submit" className="login-btn" disabled={loading}>
              {loading
                ? <span className="login-spinner" aria-hidden="true" />
                : <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="#fff"
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Send Magic Link
                  </>}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 'otp' && (
          <form className="login-form" onSubmit={handleVerify} noValidate>
            <div className="login-field">
              <label className="login-label">Verification code</label>
              <div className="otp-row" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    id={`otp-digit-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`otp-box ${digit ? 'filled' : ''}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    aria-label={`Digit ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}
            {info  && <p className="login-info"  role="status">{info}</p>}

            <button id="btn-verify-code" type="submit" className="login-btn" disabled={loading}>
              {loading
                ? <span className="login-spinner" aria-hidden="true" />
                : <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Verify Code
                  </>}
            </button>

            <button
              id="btn-back-to-email"
              type="button"
              className="login-link"
              onClick={goBack}
            >
              ← Use a different email
            </button>
          </form>
        )}

        <p className="login-footer">
          Secure admin access · Chautari © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

/* ─── Minimal dashboard shell (replace with real admin UI later) ─ */
function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <div className="dashboard">
      <header className="dash-header">
        <span className="dash-brand">Chautari Admin</span>
        <div className="dash-user">
          <span>{user?.email}</span>
          <button id="btn-logout" className="dash-logout" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="dash-main">
        <h2>Welcome back 👋</h2>
        <p>You are signed in as <strong>{user?.email}</strong>.</p>
      </main>
    </div>
  );
}

/* ─── Root ─────────────────────────────────────────────────────── */
function App() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <LoginPage />;
}

export default App;


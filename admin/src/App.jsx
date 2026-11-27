import { useState } from 'react';
import './App.css';
import { useAuth } from './auth/AuthProvider';
import UsersPage from './pages/UsersPage';

/* ─── Login page ──────────────────────────────────────────────── */
function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const hasAnonKey  = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim())    { setError('Please enter your email address.'); return; }
    if (!password.trim()) { setError('Please enter your password.'); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      const detail = [err.message, err.status ? `(status ${err.status})` : ''].filter(Boolean).join(' ');
      setError(detail || 'Login failed.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="login-card">
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
          <p className="login-subtitle">Sign in to continue to your dashboard</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="login-email" className="login-label">Email address</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"
                  stroke="currentColor" strokeWidth="1.8" />
                <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" />
              </svg>
              <input id="login-email" type="email" className="login-input"
                placeholder="admin@chautari.com" value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email" autoFocus required />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password" className="login-label">Password</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2"
                  stroke="currentColor" strokeWidth="1.8" />
                <path d="M7 11V7a5 5 0 0110 0v4"
                  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input id="login-password" type={showPw ? 'text' : 'password'}
                className="login-input login-input-pw" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required />
              <button type="button" id="btn-toggle-password" className="login-pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}>
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M17.94 17.94A10.06 10.06 0 0112 20C7 20 2.73 16.39 1 12a10.06 10.06 0 012.84-4.1M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.61 11 8a10.12 10.12 0 01-1.67 2.94M1 1l22 22"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                      stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button id="btn-sign-in" type="submit" className="login-btn" disabled={loading}>
            {loading ? <span className="login-spinner" aria-hidden="true" /> : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                    stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Debug panel */}
        <div className="login-debug">
          <strong>Debug info</strong>
          <div>SUPABASE_URL: {supabaseUrl
            ? <span className="debug-ok">{supabaseUrl}</span>
            : <span className="debug-err">❌ NOT SET</span>}
          </div>
          <div>ANON_KEY: {hasAnonKey
            ? <span className="debug-ok">✅ set</span>
            : <span className="debug-err">❌ NOT SET</span>}
          </div>
        </div>

        <p className="login-footer">
          Secure admin access · Chautari © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

/* ─── Sidebar nav ─────────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    id: 'users',
    label: 'Users',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

/* ─── Dashboard shell ─────────────────────────────────────────── */
function Dashboard() {
  const { user, logout } = useAuth();
  const [activePage, setActivePage] = useState('users');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        <div className="sidebar-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L4 6v6c0 5.25 3.4 10.15 8 11.4C16.6 22.15 20 17.25 20 12V6l-8-4z"
              fill="url(#sb-shield)" />
            <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="sb-shield" x1="4" y1="2" x2="20" y2="23"
                gradientUnits="userSpaceOnUse">
                <stop stopColor="#c084fc" /><stop offset="1" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
          {sidebarOpen && <span className="sidebar-brand-text">Chautari</span>}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
              title={item.label}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-collapse-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              style={{ transform: sidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.3s' }}>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="dash-main-area">
        {/* Top bar */}
        <header className="dash-topbar">
          <h2 className="dash-page-title">
            {NAV_ITEMS.find((i) => i.id === activePage)?.label ?? 'Dashboard'}
          </h2>
          <div className="dash-user">
            <div className="dash-avatar">{(user?.email?.[0] ?? 'A').toUpperCase()}</div>
            <span className="dash-email">{user?.email}</span>
            <button id="btn-logout" className="dash-logout" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="dash-content">
          {activePage === 'users' && <UsersPage />}
        </main>
      </div>
    </div>
  );
}

/* ─── Root ────────────────────────────────────────────────────── */
function App() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="login-bg">
        <div className="blob blob-1" /><div className="blob blob-2" /><div className="blob blob-3" />
        <span className="login-spinner" aria-label="Loading…" />
      </div>
    );
  }
  return user ? <Dashboard /> : <LoginPage />;
}

export default App;

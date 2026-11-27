import { useCallback, useEffect, useRef, useState } from 'react';
import {
  banUser,
  deleteUser,
  listUsers,
  restoreUser,
  suspendUser,
} from '../api/users';

/* ── helpers ── */
function isBanned(bannedUntil) {
  if (!bannedUntil) return false;
  return new Date(bannedUntil) > new Date();
}

function isPermanentBan(bannedUntil) {
  if (!bannedUntil) return false;
  // 100-year ban = permanent
  const diff = new Date(bannedUntil) - Date.now();
  return diff > 1000 * 60 * 60 * 24 * 365 * 50;
}

function statusLabel(user) {
  if (!user.banned_until) return { label: 'Active', cls: 'badge-active' };
  if (isPermanentBan(user.banned_until)) return { label: 'Banned', cls: 'badge-banned' };
  if (isBanned(user.banned_until)) return { label: 'Suspended', cls: 'badge-suspended' };
  return { label: 'Active', cls: 'badge-active' };
}

function Avatar({ user }) {
  if (user.photo_url) {
    return <img src={user.photo_url} alt={user.name || '?'} className="u-avatar" />;
  }
  const initials = (user.name || user.auth_email || '?')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <div className="u-avatar u-avatar-fallback">{initials}</div>;
}

/* ── Confirm dialog ── */
function ConfirmModal({ title, message, confirmLabel, confirmCls, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-box">
        <h3 className="modal-title">{title}</h3>
        <p className="modal-msg">{message}</p>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className={`modal-btn-confirm ${confirmCls || ''}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Suspend duration picker ── */
function SuspendModal({ user, onConfirm, onCancel }) {
  const [hours, setHours] = useState(24);
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-box">
        <h3 className="modal-title">Suspend user</h3>
        <p className="modal-msg">
          How long should <strong>{user.name || user.auth_email}</strong> be suspended?
        </p>
        <div className="suspend-options">
          {[
            { label: '1 hour',  value: 1 },
            { label: '24 hours', value: 24 },
            { label: '3 days',  value: 72 },
            { label: '7 days',  value: 168 },
            { label: '30 days', value: 720 },
          ].map((o) => (
            <button
              key={o.value}
              className={`suspend-opt ${hours === o.value ? 'selected' : ''}`}
              onClick={() => setHours(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="modal-btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="modal-btn-confirm btn-warn" onClick={() => onConfirm(hours)}>
            Suspend for {hours}h
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── User row ── */
function UserRow({ user, onAction }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { label, cls } = statusLabel(user);
  const banned = isBanned(user.banned_until);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <tr className="u-row">
      <td className="u-cell u-cell-user">
        <Avatar user={user} />
        <div className="u-info">
          <span className="u-name">{user.name || <em className="u-no-name">No name</em>}</span>
          <span className="u-email">{user.auth_email || user.email || '—'}</span>
        </div>
      </td>
      <td className="u-cell u-cell-phone">{user.phone || '—'}</td>
      <td className="u-cell u-cell-suburb">{user.suburb || '—'}</td>
      <td className="u-cell">
        <span className={`badge ${cls}`}>{label}</span>
        {user.verified && <span className="badge badge-verified">Expert</span>}
      </td>
      <td className="u-cell u-cell-date">
        {new Date(user.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="u-cell u-cell-actions">
        <div className="menu-wrap" ref={menuRef}>
          <button
            className="menu-trigger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Actions"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5"  r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <ul className="menu-list" role="menu">
              {banned ? (
                <li role="menuitem">
                  <button className="menu-item menu-item-safe" onClick={() => { setMenuOpen(false); onAction('restore', user); }}>
                    ✅ Restore access
                  </button>
                </li>
              ) : (
                <>
                  <li role="menuitem">
                    <button className="menu-item menu-item-warn" onClick={() => { setMenuOpen(false); onAction('suspend', user); }}>
                      ⏸ Suspend
                    </button>
                  </li>
                  <li role="menuitem">
                    <button className="menu-item menu-item-danger" onClick={() => { setMenuOpen(false); onAction('ban', user); }}>
                      🚫 Ban permanently
                    </button>
                  </li>
                </>
              )}
              <li role="separator" className="menu-sep" />
              <li role="menuitem">
                <button className="menu-item menu-item-delete" onClick={() => { setMenuOpen(false); onAction('delete', user); }}>
                  🗑 Delete account
                </button>
              </li>
            </ul>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ── Main Users page ── */
export default function UsersPage() {
  const [users, setUsers]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');
  const [modal, setModal]       = useState(null); // { type, user }
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await listUsers({ page, pageSize: PAGE_SIZE, search });
      setUsers(res.users);
      setTotal(res.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  const searchTimer = useRef(null);
  const handleSearchInput = (val) => {
    setInputVal(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleAction = (type, user) => setModal({ type, user });

  const closeModal = () => setModal(null);

  const executeAction = async (type, user, extra = {}) => {
    closeModal();
    try {
      if (type === 'suspend') await suspendUser(user.id, extra.hours);
      if (type === 'ban')     await banUser(user.id);
      if (type === 'restore') await restoreUser(user.id);
      if (type === 'delete')  await deleteUser(user.id);
      showToast(
        type === 'suspend' ? `${user.name || 'User'} suspended for ${extra.hours}h` :
        type === 'ban'     ? `${user.name || 'User'} permanently banned` :
        type === 'restore' ? `${user.name || 'User'} access restored` :
                             `Account deleted`
      );
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="page-users">
      {/* Toast */}
      {toast && <div className="toast" role="status">{toast}</div>}

      {/* Modals */}
      {modal?.type === 'suspend' && (
        <SuspendModal
          user={modal.user}
          onConfirm={(hours) => executeAction('suspend', modal.user, { hours })}
          onCancel={closeModal}
        />
      )}
      {modal?.type === 'ban' && (
        <ConfirmModal
          title="Ban user permanently?"
          message={`${modal.user.name || modal.user.auth_email} will be permanently banned and unable to sign in.`}
          confirmLabel="Ban permanently"
          confirmCls="btn-danger"
          onConfirm={() => executeAction('ban', modal.user)}
          onCancel={closeModal}
        />
      )}
      {modal?.type === 'restore' && (
        <ConfirmModal
          title="Restore access?"
          message={`${modal.user.name || modal.user.auth_email} will be able to sign in again.`}
          confirmLabel="Restore"
          confirmCls="btn-safe"
          onConfirm={() => executeAction('restore', modal.user)}
          onCancel={closeModal}
        />
      )}
      {modal?.type === 'delete' && (
        <ConfirmModal
          title="Delete account permanently?"
          message={`This will permanently delete ${modal.user.name || modal.user.auth_email}'s account and all their data. This cannot be undone.`}
          confirmLabel="Delete permanently"
          confirmCls="btn-danger"
          onConfirm={() => executeAction('delete', modal.user)}
          onCancel={closeModal}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="page-subtitle">{total.toLocaleString()} total members</p>
        </div>
        <div className="search-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id="users-search"
            type="search"
            className="search-input"
            placeholder="Search name, phone, email…"
            value={inputVal}
            onChange={(e) => handleSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && <div className="page-error" role="alert">⚠ {error}</div>}

      {/* Table */}
      <div className="table-wrap">
        <table className="u-table">
          <thead>
            <tr>
              <th className="u-th">User</th>
              <th className="u-th">Phone</th>
              <th className="u-th">Suburb</th>
              <th className="u-th">Status</th>
              <th className="u-th">Joined</th>
              <th className="u-th u-th-actions"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="u-cell-loading">
                  <span className="table-spinner" /> Loading…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={6} className="u-cell-empty">No users found.</td>
              </tr>
            )}
            {!loading && users.map((u) => (
              <UserRow key={u.id} user={u} onAction={handleAction} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>
          <span className="page-info">Page {page} of {totalPages}</span>
          <button
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

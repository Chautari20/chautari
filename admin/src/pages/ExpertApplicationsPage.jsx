import { useCallback, useEffect, useRef, useState } from 'react';
import {
  approveExpertApplication,
  listExpertApplications,
  rejectExpertApplication,
} from '../api/users';

const PAGE_SIZE = 20;

function credentialUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return url;
}

export default function ExpertApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('pending');
  const [search, setSearch] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);
  const searchTimer = useRef(null);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listExpertApplications({ page, pageSize: PAGE_SIZE, search, status });
      setApplications(res.applications || []);
      setTotal(res.total || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (value) => {
    setInputVal(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(value); setPage(1); }, 400);
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const approve = async (application) => {
    setActing(true);
    setError('');
    try {
      await approveExpertApplication(application.id);
      setSelected(null);
      showToast('Application approved');
      load();
    } catch (e) { setError(e.message); }
    finally { setActing(false); }
  };

  const reject = async () => {
    if (!rejecting || !reason.trim()) return;
    setActing(true);
    setError('');
    try {
      await rejectExpertApplication(rejecting.id, reason.trim());
      setRejecting(null);
      setSelected(null);
      setReason('');
      showToast('Application rejected');
      load();
    } catch (e) { setError(e.message); }
    finally { setActing(false); }
  };

  const profileName = (application) =>
    application.profiles?.name || application.profiles?.email || application.user_id;

  return (
    <div className="page-users">
      {toast && <div className="toast" role="status">{toast}</div>}

      {selected && (
        <div className="modal-overlay expert-overlay" role="dialog" aria-modal="true">
          <div className="modal-box expert-detail">
            <div className="expert-detail-head">
              <div>
                <h3 className="modal-title">Expert application</h3>
                <p className="expert-submitted">Submitted {new Date(selected.created_at).toLocaleString('en-AU')}</p>
              </div>
              <button className="expert-close" onClick={() => setSelected(null)} aria-label="Close">×</button>
            </div>

            <div className="expert-profile">
              {selected.profiles?.photo_url
                ? <img className="expert-avatar" src={selected.profiles.photo_url} alt="" />
                : <div className="expert-avatar expert-avatar-fallback">{profileName(selected)[0]?.toUpperCase()}</div>}
              <div>
                <strong>{profileName(selected)}</strong>
                <span>{selected.profiles?.email || 'No recovery email'}</span>
                <span>{selected.profiles?.phone || 'No phone'}</span>
              </div>
            </div>

            <div className="expert-grid">
              <div><small>Professional title</small><strong>{selected.custom_category || '—'}</strong></div>
              <div><small>Circle / category</small><strong>{selected.category || '—'}</strong></div>
              <div><small>Suburb</small><strong>{selected.profiles?.suburb || '—'}</strong></div>
              <div><small>Status</small><span className={`expert-status expert-status-${selected.status}`}>{selected.status}</span></div>
            </div>

            {selected.profiles?.bio && <div className="expert-bio"><small>Profile bio</small><p>{selected.profiles.bio}</p></div>}

            {selected.credentials_url ? (
              <div className="credential-section">
                <small>Credential document</small>
                <a href={credentialUrl(selected.credentials_url)} target="_blank" rel="noreferrer">
                  {selected.credential_name || 'Open credential document'}
                </a>
              </div>
            ) : <div className="credential-section"><small>Credential document</small><span>Not provided</span></div>}

            {selected.rejection_reason && <div className="expert-rejection"><small>Rejection reason</small><p>{selected.rejection_reason}</p></div>}

            {selected.status === 'pending' && (
              <div className="modal-actions expert-actions">
                <button className="modal-btn-cancel" onClick={() => { setSelected(null); setRejecting(selected); setReason(''); }} disabled={acting}>Reject</button>
                <button className="modal-btn-confirm btn-safe" onClick={() => approve(selected)} disabled={acting}>{acting ? 'Approving…' : 'Approve application'}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {rejecting && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box reject-modal">
            <h3 className="modal-title">Reject application</h3>
            <p className="modal-msg">Explain to the applicant why their credentials or application could not be approved.</p>
            <label className="post-field">Rejection reason
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={1000} rows={5} required />
            </label>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => { setRejecting(null); setReason(''); }} disabled={acting}>Cancel</button>
              <button className="modal-btn-confirm btn-danger" onClick={reject} disabled={acting || !reason.trim()}>{acting ? 'Rejecting…' : 'Reject application'}</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div><h2 className="page-title">Expert Applications</h2><p className="page-subtitle">{total.toLocaleString()} applications</p></div>
        <div className="post-tools">
          <div className="expert-tabs">
            {['pending', 'approved', 'rejected', 'all'].map((value) => (
              <button key={value} className={status === value ? 'active' : ''} onClick={() => { setStatus(value); setPage(1); }}>
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" /></svg>
            <input className="search-input" type="search" placeholder="Search title or category…" value={inputVal} onChange={(e) => handleSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {error && <div className="page-error" role="alert">⚠ {error}</div>}
      <div className="table-wrap">
        <table className="u-table expert-table">
          <thead><tr><th className="u-th">Applicant</th><th className="u-th">Professional title</th><th className="u-th">Category</th><th className="u-th">Status</th><th className="u-th">Submitted</th><th className="u-th u-th-actions"></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="u-cell-loading"><span className="table-spinner" />Loading…</td></tr>}
            {!loading && applications.length === 0 && <tr><td colSpan={6} className="u-cell-empty">No applications found.</td></tr>}
            {!loading && applications.map((application) => (
              <tr className="u-row" key={application.id}>
                <td className="u-cell expert-applicant"><strong>{profileName(application)}</strong><span>{application.profiles?.suburb || 'No suburb'}</span></td>
                <td className="u-cell post-meta">{application.custom_category || '—'}</td>
                <td className="u-cell post-meta">{application.category || '—'}</td>
                <td className="u-cell"><span className={`expert-status expert-status-${application.status}`}>{application.status}</span></td>
                <td className="u-cell u-cell-date">{new Date(application.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="u-cell u-cell-actions"><button className="post-action" onClick={() => setSelected(application)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && <div className="pagination"><button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button><span className="page-info">Page {page} of {totalPages}</span><button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button></div>}
    </div>
  );
}

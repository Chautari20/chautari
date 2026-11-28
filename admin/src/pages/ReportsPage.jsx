import { useCallback, useEffect, useState } from 'react';
import { dismissReport, listReports, resolveReport } from '../api/users';

const PAGE_SIZE = 20;

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('open');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [acting, setActing] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listReports({ page, pageSize: PAGE_SIZE, status, type });
      setReports(res.reports || []);
      setTotal(res.total || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, status, type]);

  useEffect(() => { load(); }, [load]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const moderate = async (action) => {
    if (!selected) return;
    setActing(true);
    setError('');
    try {
      if (action === 'resolve') await resolveReport(selected.id, note.trim());
      else await dismissReport(selected.id, note.trim());
      setSelected(null);
      setNote('');
      showToast(action === 'resolve' ? 'Report resolved' : 'Report dismissed');
      await load();
    } catch (e) { setError(e.message); }
    finally { setActing(false); }
  };

  const contentText = (report) => {
    if (!report.content) return report.target_title || 'Content no longer available';
    if (report.target_type === 'expert' || report.target_type === 'profile') return report.content.bio || report.content.name || report.target_title || 'User profile';
    return report.content.title ? `${report.content.title}\n${report.content.body || ''}` : report.content.body || 'Content no longer available';
  };

  return (
    <div className="page-users">
      {toast && <div className="toast" role="status">{toast}</div>}

      {selected && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box report-detail">
            <div className="expert-detail-head">
              <div><h3 className="modal-title">Reported {selected.target_type || (selected.kind === 'expert' ? 'expert' : 'content')}</h3><p className="expert-submitted">Reported {new Date(selected.created_at).toLocaleString('en-AU')}</p></div>
              <button className="expert-close" onClick={() => setSelected(null)}>×</button>
            </div>

            <div className="report-content"><small>Reported content</small><p>{contentText(selected)}</p></div>
            <div className="expert-grid">
              <div><small>Type</small><strong>{selected.target_type || selected.kind}</strong></div>
              <div><small>Reason</small><strong>{selected.reason}</strong></div>
              <div><small>Reporter</small><strong>{selected.reporter?.name || selected.reporter?.email || 'Unknown'}</strong></div>
              <div><small>Status</small><strong>{selected.status}</strong></div>
            </div>
            {selected.detail && <div className="expert-bio"><small>Additional details</small><p>{selected.detail}</p></div>}

            {selected.status === 'open' && (
              <>
                <label className="post-field">Resolution note<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={4} placeholder="Optional internal/admin note" /></label>
                <div className="modal-actions expert-actions">
                  <button className="modal-btn-cancel" onClick={() => moderate('dismiss')} disabled={acting}>Dismiss</button>
                  <button className="modal-btn-confirm btn-safe" onClick={() => moderate('resolve')} disabled={acting}>{acting ? 'Saving…' : 'Resolve'}</button>
                </div>
              </>
            )}
            {selected.status !== 'open' && selected.resolution_note && <div className="expert-rejection"><small>Resolution note</small><p>{selected.resolution_note}</p></div>}
          </div>
        </div>
      )}

      <div className="page-header">
        <div><h2 className="page-title">Reports</h2><p className="page-subtitle">{total.toLocaleString()} reports</p></div>
        <div className="post-tools">
          <select className="filter-select" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
            <option value="all">All types</option><option value="expert">Experts first</option><option value="post">Posts</option><option value="answer">Answers</option><option value="reply">Replies</option><option value="profile">Profiles</option>
          </select>
          <select className="filter-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="open">Open</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option><option value="all">All statuses</option>
          </select>
        </div>
      </div>

      {error && <div className="page-error" role="alert">⚠ {error}</div>}
      <div className="table-wrap"><table className="u-table"><thead><tr><th className="u-th">Report</th><th className="u-th">Type</th><th className="u-th">Reason</th><th className="u-th">Reporter</th><th className="u-th">Received</th><th className="u-th u-th-actions"></th></tr></thead>
        <tbody>
          {loading && <tr><td colSpan={6} className="u-cell-loading"><span className="table-spinner" />Loading…</td></tr>}
          {!loading && reports.length === 0 && <tr><td colSpan={6} className="u-cell-empty">No reports found.</td></tr>}
          {!loading && reports.map((report) => <tr className="u-row" key={report.id}><td className="u-cell report-title"><strong>{report.target_title || 'Reported content'}</strong><span>{contentText(report)}</span></td><td className="u-cell"><span className={`expert-status ${report.kind === 'expert' ? 'expert-status-approved' : ''}`}>{report.target_type || (report.kind === 'expert' ? 'expert' : 'content')}</span></td><td className="u-cell post-meta">{report.reason}</td><td className="u-cell post-meta">{report.reporter?.name || report.reporter?.email || 'Unknown'}</td><td className="u-cell u-cell-date">{new Date(report.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td><td className="u-cell u-cell-actions"><button className="post-action" onClick={() => { setSelected(report); setNote(report.resolution_note || ''); }}>View</button></td></tr>)}
        </tbody>
      </table></div>

      {totalPages > 1 && <div className="pagination"><button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button><span className="page-info">Page {page} of {totalPages}</span><button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button></div>}
    </div>
  );
}

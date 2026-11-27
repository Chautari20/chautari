import { useCallback, useEffect, useRef, useState } from 'react';
import { createPost, deletePost, listPostCircles, listPosts, updatePost } from '../api/users';
import { listUsers } from '../api/users';

const PAGE_SIZE = 20;

function PostModal({ post, circles, users, onSave, onClose }) {
  const [form, setForm] = useState({
    authorId: post?.author_id || '',
    circleId: post?.circle_id || '',
    title: post?.title || '',
    body: post?.body || '',
    anonymous: !!post?.anonymous,
    postedAsExpert: !!post?.posted_as_expert,
    professionLabel: post?.profession_label || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((v) => ({ ...v, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); } catch (_) {}
    setSaving(false);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <form className="modal-box post-modal" onSubmit={submit}>
        <h3 className="modal-title">{post ? 'Edit post' : 'Create post'}</h3>
        {!post && (
          <label className="post-field">Author
            <select value={form.authorId} onChange={(e) => set('authorId', e.target.value)} required>
              <option value="">Select author</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.auth_email || u.email || u.id}</option>)}
            </select>
          </label>
        )}
        <label className="post-field">Circle
          <select value={form.circleId} onChange={(e) => set('circleId', e.target.value)} required>
            <option value="">Select circle</option>
            {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="post-field">Title
          <input value={form.title} onChange={(e) => set('title', e.target.value)} minLength={10} maxLength={120} required />
        </label>
        <label className="post-field">Body
          <textarea value={form.body} onChange={(e) => set('body', e.target.value)} minLength={30} maxLength={4000} rows={7} required />
        </label>
        <div className="post-checks">
          <label><input type="checkbox" checked={form.anonymous} onChange={(e) => set('anonymous', e.target.checked)} /> Anonymous</label>
          <label><input type="checkbox" checked={form.postedAsExpert} onChange={(e) => set('postedAsExpert', e.target.checked)} /> Expert post</label>
        </div>
        {form.postedAsExpert && (
          <label className="post-field">Profession label
            <input value={form.professionLabel} onChange={(e) => set('professionLabel', e.target.value)} />
          </label>
        )}
        <div className="modal-actions">
          <button type="button" className="modal-btn-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="modal-btn-confirm btn-safe" disabled={saving}>{saving ? 'Saving…' : 'Save post'}</button>
        </div>
      </form>
    </div>
  );
}

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [circleId, setCircleId] = useState('all');
  const [expert, setExpert] = useState('all');
  const [circles, setCircles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [modalPost, setModalPost] = useState(null);
  const [confirmPost, setConfirmPost] = useState(null);
  const searchTimer = useRef(null);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listPosts({ page, pageSize: PAGE_SIZE, search, circleId, expert });
      setPosts(res.posts || []);
      setTotal(res.total || 0);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search, circleId, expert]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([listPostCircles(), listUsers({ page: 1, pageSize: 100 })])
      .then(([c, u]) => { setCircles(c.circles || []); setUsers(u.users || []); })
      .catch((e) => setError(e.message));
  }, []);

  const handleSearch = (value) => {
    setInputVal(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(value); setPage(1); }, 400);
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const savePost = async (form) => {
    try {
      if (modalPost) await updatePost(modalPost.id, form);
      else await createPost(form);
      setModalPost(null);
      showToast(modalPost ? 'Post updated' : 'Post created');
      load();
    } catch (e) { setError(e.message); throw e; }
  };

  const removePost = async () => {
    if (!confirmPost) return;
    try {
      await deletePost(confirmPost.id);
      setConfirmPost(null);
      showToast('Post deleted');
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="page-users">
      {toast && <div className="toast" role="status">{toast}</div>}
      {modalPost !== null && (
        <PostModal post={modalPost?.id ? modalPost : null} circles={circles} users={users} onSave={savePost} onClose={() => setModalPost(null)} />
      )}
      {confirmPost && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-box">
            <h3 className="modal-title">Delete post permanently?</h3>
            <p className="modal-msg">“{confirmPost.title}” and its answers/replies will be deleted.</p>
            <div className="modal-actions">
              <button className="modal-btn-cancel" onClick={() => setConfirmPost(null)}>Cancel</button>
              <button className="modal-btn-confirm btn-danger" onClick={removePost}>Delete permanently</button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div><h2 className="page-title">Posts</h2><p className="page-subtitle">{total.toLocaleString()} total posts</p></div>
        <div className="post-tools">
          <select className="filter-select" value={circleId} onChange={(e) => { setCircleId(e.target.value); setPage(1); }}>
            <option value="all">All circles</option>
            {circles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="filter-select" value={expert} onChange={(e) => { setExpert(e.target.value); setPage(1); }}>
            <option value="all">All posts</option>
            <option value="expert">Expert posts</option>
            <option value="member">Member posts</option>
          </select>
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" /><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" /></svg>
            <input className="search-input" type="search" placeholder="Search title or body…" value={inputVal} onChange={(e) => handleSearch(e.target.value)} />
          </div>
          <button className="create-btn" onClick={() => setModalPost({})}>+ Create post</button>
        </div>
      </div>

      {error && <div className="page-error" role="alert">⚠ {error}</div>}
      <div className="table-wrap">
        <table className="u-table post-table">
          <thead><tr><th className="u-th">Post</th><th className="u-th">Circle</th><th className="u-th">Author</th><th className="u-th">Stats</th><th className="u-th">Created</th><th className="u-th u-th-actions"></th></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="u-cell-loading"><span className="table-spinner" />Loading…</td></tr>}
            {!loading && posts.length === 0 && <tr><td colSpan={6} className="u-cell-empty">No posts found.</td></tr>}
            {!loading && posts.map((post) => (
              <tr className="u-row" key={post.id}>
                <td className="u-cell post-main"><strong>{post.title}</strong><span>{post.body}</span>{post.posted_as_expert && <em className="post-expert">Expert · {post.profession_label || 'Professional'}</em>}</td>
                <td className="u-cell post-meta">{post.circles?.name || '—'}</td>
                <td className="u-cell post-meta">{post.anonymous ? 'Anonymous' : post.profiles?.name || post.profiles?.email || '—'}</td>
                <td className="u-cell post-meta">▲ {post.upvotes || 0} · 👁 {post.views || 0}</td>
                <td className="u-cell u-cell-date">{new Date(post.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                <td className="u-cell u-cell-actions"><button className="post-action" onClick={() => setModalPost(post)}>Edit</button><button className="post-action post-delete" onClick={() => setConfirmPost(post)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && <div className="pagination"><button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Prev</button><span className="page-info">Page {page} of {totalPages}</span><button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button></div>}
    </div>
  );
}

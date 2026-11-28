/**
 * admin-users Edge Function
 *
 * Uses the Supabase Auth Admin REST API directly (via fetch) because
 * supabase-js in Deno does NOT expose db.auth.admin.
 *
 * Routes (all POST, action in body):
 *   { action: 'list',    page, pageSize, search }
 *   { action: 'suspend', userId, hours }
 *   { action: 'ban',     userId }
 *   { action: 'restore', userId }
 *   { action: 'delete',  userId }
 *   { action: 'list-posts', page, pageSize, search, circleId, authorId, expert }
 *   { action: 'list-post-circles' }
 *   { action: 'create-post', authorId, circleId, title, body, anonymous, photos, postedAsExpert, professionLabel }
 *   { action: 'update-post', postId, circleId, title, body, anonymous, photos, postedAsExpert, professionLabel }
 *   { action: 'delete-post', postId }
 *   { action: 'list-expert-applications', page, pageSize, search, status }
 *   { action: 'approve-expert-application', applicationId }
 *   { action: 'reject-expert-application', applicationId, reason }
 *   { action: 'list-reports', page, pageSize, status, type }
 *   { action: 'resolve-report', reportId, note }
 *   { action: 'dismiss-report', reportId, note }
 */
import { fail, failLogged, MSG, ok, preflight } from '../_shared/http.ts';
import { serviceClient } from '../_shared/db.ts';


// ── Auth Admin REST helpers ──────────────────────────────────────────────────

function supabaseUrl(): string {
  const u = Deno.env.get('SUPABASE_URL');
  if (!u) throw new Error('SUPABASE_URL not set');
  return u;
}

function serviceKey(): string {
  const k = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!k) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set');
  return k;
}

function adminHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${serviceKey()}`,
    'apikey': serviceKey(),
  };
}

/** GET /auth/v1/admin/users/:id */
async function getAuthUser(userId: string) {
  const res = await fetch(
    `${supabaseUrl()}/auth/v1/admin/users/${userId}`,
    { headers: adminHeaders() },
  );
  if (!res.ok) return null;
  return res.json();
}

/** PUT /auth/v1/admin/users/:id  — update ban_duration */
async function updateAuthUser(userId: string, payload: Record<string, unknown>) {
  const res = await fetch(
    `${supabaseUrl()}/auth/v1/admin/users/${userId}`,
    {
      method: 'PUT',
      headers: adminHeaders(),
      body: JSON.stringify(payload),
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || body?.error_description || 'Auth API error');
  return body;
}

/** DELETE /auth/v1/admin/users/:id */
async function deleteAuthUser(userId: string) {
  const res = await fetch(
    `${supabaseUrl()}/auth/v1/admin/users/${userId}`,
    { method: 'DELETE', headers: adminHeaders() },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || body?.error_description || 'Auth API error');
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return fail(MSG.generic, 405);

  try {
    const db   = serviceClient();
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── list ──────────────────────────────────────────────────────────────
    if (action === 'list') {
      const page     = Math.max(1, Number(body.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(body.pageSize) || 20));
      const search   = String(body.search || '').trim();
      const from     = (page - 1) * pageSize;
      const to       = from + pageSize - 1;

      let q = db
        .from('profiles')
        .select(
          'id, name, phone, email, suburb, photo_url, bio, verified, ' +
          'is_founding_member, followers_count, created_at, updated_at',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to);

      if (search) {
        const s = search.replace(/'/g, "''");
        q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`);
      }

      const { data, count, error } = await q;
      if (error) return failLogged('admin-users.list.query', error);

      // Fetch ban status for each user via Auth Admin API
      const rows = await Promise.all(
        (data ?? []).map(async (p: Record<string, unknown>) => {
          const authUser = await getAuthUser(p.id as string).catch(() => null);
          return {
            ...p,
            auth_email:  authUser?.email  ?? null,
            banned_until: authUser?.banned_until ?? null,
          };
        }),
      );

      return ok({ users: rows, total: count ?? 0, page, pageSize });
    }

    // ── suspend ───────────────────────────────────────────────────────────
    if (action === 'suspend') {
      const { userId, hours } = body;
      if (!userId) return fail('userId required');
      const h = Math.max(1, Number(hours) || 24);
      await updateAuthUser(userId, { ban_duration: `${h}h` });
      const bannedUntil = new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
      return ok({ banned_until: bannedUntil });
    }

    // ── ban (permanent) ───────────────────────────────────────────────────
    if (action === 'ban') {
      const { userId } = body;
      if (!userId) return fail('userId required');
      await updateAuthUser(userId, { ban_duration: '876600h' }); // ~100 years
      return ok({});
    }

    // ── restore ───────────────────────────────────────────────────────────
    if (action === 'restore') {
      const { userId } = body;
      if (!userId) return fail('userId required');
      await updateAuthUser(userId, { ban_duration: 'none' });
      return ok({});
    }

    // ── delete ────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { userId } = body;
      if (!userId) return fail('userId required');
      await deleteAuthUser(userId);
      return ok({});
    }

    // ── posts list ────────────────────────────────────────────────────────
    if (action === 'list-posts') {
      const page = Math.max(1, Number(body.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(body.pageSize) || 20));
      const search = String(body.search || '').trim();
      const circleId = String(body.circleId || '').trim();
      const authorId = String(body.authorId || '').trim();
      const expert = String(body.expert || '').trim();
      const anonymous = String(body.anonymous || 'all').trim();
      const sort = String(body.sort || 'newest').trim();
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = db
        .from('posts')
        .select(
          'id, circle_id, author_id, anonymous, title, body, photos, upvotes, views, ' +
          'posted_as_expert, profession_label, created_at, updated_at, ' +
          'profiles(name, email, suburb, photo_url), circles!posts_circle_id_fkey(name, handle)',
          { count: 'exact' },
        )
        .order(sort === 'oldest' ? 'created_at' : sort === 'popular' ? 'upvotes' : 'created_at', {
          ascending: sort === 'oldest',
        })
        .range(from, to);

      if (search) {
        const s = search.replace(/'/g, "''");
        q = q.or(`title.ilike.%${s}%,body.ilike.%${s}%`);
      }
      if (circleId && circleId !== 'all') q = q.eq('circle_id', circleId);
      if (authorId) q = q.eq('author_id', authorId);
      if (expert === 'expert') q = q.eq('posted_as_expert', true);
      if (expert === 'member') q = q.or('posted_as_expert.is.null,posted_as_expert.eq.false');
      if (anonymous === 'anonymous') q = q.eq('anonymous', true);
      if (anonymous === 'named') q = q.eq('anonymous', false);
      if (anonymous === 'yes') q = q.eq('anonymous', true);
      if (anonymous === 'no') q = q.eq('anonymous', false);

      const { data, count, error } = await q;
      if (error) return failLogged('admin-users.list-posts.query', error);

      return ok({ posts: data ?? [], total: count ?? 0, page, pageSize });
    }

    // ── posts circles ─────────────────────────────────────────────────────
    if (action === 'list-post-circles') {
      const { data, error } = await db
        .from('circles')
        .select('id, name, handle')
        .order('name', { ascending: true });
      if (error) return failLogged('admin-users.list-post-circles.query', error);
      return ok({ circles: data ?? [] });
    }

    // ── create post ───────────────────────────────────────────────────────
    if (action === 'create-post') {
      const { authorId, circleId, title, body: postBody, anonymous, photos, postedAsExpert, professionLabel } = body;
      if (!authorId || !circleId || !title || !postBody) return fail('authorId, circleId, title and body are required');

      const { data, error } = await db
        .from('posts')
        .insert({
          id: crypto.randomUUID(),
          author_id: authorId,
          circle_id: circleId,
          title,
          body: postBody,
          anonymous: !!anonymous,
          photos: Array.isArray(photos) ? photos : [],
          posted_as_expert: !!postedAsExpert,
          profession_label: postedAsExpert ? String(professionLabel || '').trim() || null : null,
        })
        .select()
        .single();
      if (error) return failLogged('admin-users.create-post.insert', error);
      return ok({ post: data });
    }

    // ── update post ───────────────────────────────────────────────────────
    if (action === 'update-post') {
      const { postId } = body;
      if (!postId) return fail('postId required');

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.circleId !== undefined) patch.circle_id = body.circleId;
      if (body.title !== undefined) patch.title = body.title;
      if (body.body !== undefined) patch.body = body.body;
      if (body.anonymous !== undefined) patch.anonymous = !!body.anonymous;
      if (body.photos !== undefined) patch.photos = Array.isArray(body.photos) ? body.photos : [];
      if (body.postedAsExpert !== undefined) {
        patch.posted_as_expert = !!body.postedAsExpert;
        patch.profession_label = body.postedAsExpert
          ? String(body.professionLabel || '').trim() || null
          : null;
      }

      const { data, error } = await db
        .from('posts')
        .update(patch)
        .eq('id', postId)
        .select()
        .single();
      if (error) return failLogged('admin-users.update-post.update', error);
      return ok({ post: data });
    }

    // ── delete post ───────────────────────────────────────────────────────
    if (action === 'delete-post') {
      const postId = body.postId;
      if (!postId) return fail('postId required');
      const { error } = await db.from('posts').delete().eq('id', postId);
      if (error) return failLogged('admin-users.delete-post.delete', error);
      return ok({});
    }

    // ── expert applications list ──────────────────────────────────────────
    if (action === 'list-expert-applications') {
      const page = Math.max(1, Number(body.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(body.pageSize) || 20));
      const search = String(body.search || '').trim();
      const status = String(body.status || 'pending').trim();
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = db
        .from('expert_applications')
        .select(
          'id, user_id, category, custom_category, status, credentials_url, credential_name, ' +
          'rejection_reason, created_at, updated_at, reviewed_at, ' +
          'profiles(id, name, phone, email, suburb, photo_url, bio, verified, profession, contact, ' +
          'expert_badge_title, expert_circle_id, expert_badge_status, expert_badge_reason, ' +
          'expert_badge_updated_at, followers_count, created_at, updated_at)',
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to);

      if (status !== 'all') q = q.eq('status', status);
      if (search) {
        const s = search.replace(/'/g, "''");
        q = q.or(`custom_category.ilike.%${s}%,category.ilike.%${s}%`);
      }

      const { data, count, error } = await q;
      if (error) return failLogged('admin-users.list-expert-applications.query', error);
      return ok({ applications: data ?? [], total: count ?? 0, page, pageSize });
    }

    // ── approve expert application ────────────────────────────────────────
    if (action === 'approve-expert-application') {
      const applicationId = body.applicationId;
      if (!applicationId) return fail('applicationId required');

      const { data: application, error: lookupError } = await db
        .from('expert_applications')
        .select('id, user_id, category, custom_category, status')
        .eq('id', applicationId)
        .single();
      if (lookupError) return failLogged('admin-users.approve-expert.lookup', lookupError);
      if (!application || application.status !== 'pending') return fail('Application is not pending');

      const badgeTitle = String(application.custom_category || '').trim();
      const circleId = application.category ? String(application.category) : null;
      const verifiedCategory = circleId ? String(circleId).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : null;

      const { error: profileError } = await db.from('profiles').update({
        verified: true,
        verified_category: verifiedCategory,
        profession: badgeTitle || null,
        expert_badge_title: badgeTitle || null,
        expert_circle_id: circleId,
        expert_badge_status: 'active',
        expert_badge_reason: null,
        expert_badge_updated_at: new Date().toISOString(),
      }).eq('id', application.user_id);
      if (profileError) return failLogged('admin-users.approve-expert.profile', profileError);

      const now = new Date().toISOString();
      const { error } = await db.from('expert_applications').update({
        status: 'approved',
        rejection_reason: null,
        reviewed_at: now,
        updated_at: now,
      }).eq('id', applicationId).eq('status', 'pending');
      if (error) return failLogged('admin-users.approve-expert.application', error);

      return ok({});
    }

    // ── reject expert application ─────────────────────────────────────────
    if (action === 'reject-expert-application') {
      const applicationId = body.applicationId;
      const reason = String(body.reason || '').trim();
      if (!applicationId) return fail('applicationId required');
      if (!reason) return fail('A rejection reason is required');

      const now = new Date().toISOString();
      const { data, error } = await db
        .from('expert_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', applicationId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (error) return failLogged('admin-users.reject-expert.application', error);
      if (!data) return fail('Application is not pending');

      return ok({});
    }

    // ── suspend expert badge ──────────────────────────────────────────
    if (action === 'suspend-expert-badge') {
      const applicationId = body.applicationId;
      const reason = String(body.reason || '').trim();
      if (!applicationId) return fail('applicationId required');
      if (!reason) return fail('A suspension reason is required');

      const { data: application, error: lookupError } = await db
        .from('expert_applications').select('user_id, status').eq('id', applicationId).maybeSingle();
      if (lookupError) return failLogged('admin-users.suspend-expert.lookup', lookupError);
      if (!application || application.status !== 'approved') return fail('Application is not approved');

      const now = new Date().toISOString();
      const { error } = await db.from('profiles').update({
        verified: false,
        expert_badge_status: 'suspended',
        expert_badge_reason: reason,
        expert_badge_updated_at: now,
      }).eq('id', application.user_id);
      if (error) return failLogged('admin-users.suspend-expert.profile', error);
      return ok({});
    }

    // ── restore expert badge ──────────────────────────────────────────
    if (action === 'restore-expert-badge') {
      const applicationId = body.applicationId;
      if (!applicationId) return fail('applicationId required');

      const { data: application, error: lookupError } = await db
        .from('expert_applications').select('user_id, status').eq('id', applicationId).maybeSingle();
      if (lookupError) return failLogged('admin-users.restore-expert.lookup', lookupError);
      if (!application || application.status !== 'approved') return fail('Application is not approved');

      const now = new Date().toISOString();
      const { error } = await db.from('profiles').update({
        verified: true,
        expert_badge_status: 'active',
        expert_badge_reason: null,
        expert_badge_updated_at: now,
      }).eq('id', application.user_id);
      if (error) return failLogged('admin-users.restore-expert.profile', error);
      return ok({});
    }

    // ── revoke expert badge ───────────────────────────────────────────
    if (action === 'revoke-expert-badge') {
      const applicationId = body.applicationId;
      const reason = String(body.reason || '').trim();
      if (!applicationId) return fail('applicationId required');
      if (!reason) return fail('A revocation reason is required');

      const { data: application, error: lookupError } = await db
        .from('expert_applications').select('user_id, status').eq('id', applicationId).maybeSingle();
      if (lookupError) return failLogged('admin-users.revoke-expert.lookup', lookupError);
      if (!application || application.status !== 'approved') return fail('Application is not approved');

      const now = new Date().toISOString();
      const { error: profileError } = await db.from('profiles').update({
        verified: false,
        verified_category: null,
        profession: null,
        expert_badge_title: null,
        expert_circle_id: null,
        expert_badge_status: 'revoked',
        expert_badge_reason: reason,
        expert_badge_updated_at: now,
      }).eq('id', application.user_id);
      if (profileError) return failLogged('admin-users.revoke-expert.profile', profileError);

      const { error: applicationError } = await db.from('expert_applications').update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: now,
        updated_at: now,
      }).eq('id', applicationId).eq('status', 'approved');
      if (applicationError) return failLogged('admin-users.revoke-expert.application', applicationError);
      return ok({});
    }

    // ── suspend ───────────────────────────────────────────────────────────
    if (action === 'suspend') {
      const { userId, hours } = body;
      if (!userId) return fail('userId required');
      const h = Math.max(1, Number(hours) || 24);
      await updateAuthUser(userId, { ban_duration: `${h}h` });
      const bannedUntil = new Date(Date.now() + h * 60 * 60 * 1000).toISOString();
      return ok({ banned_until: bannedUntil });
    }

    // ── ban (permanent) ───────────────────────────────────────────────────
    if (action === 'ban') {
      const { userId } = body;
      if (!userId) return fail('userId required');
      await updateAuthUser(userId, { ban_duration: '876600h' });
      return ok({});
    }

    // ── restore ───────────────────────────────────────────────────────────
    if (action === 'restore') {
      const { userId } = body;
      if (!userId) return fail('userId required');
      await updateAuthUser(userId, { ban_duration: 'none' });
      return ok({});
    }

    // ── delete ────────────────────────────────────────────────────────────
    if (action === 'delete') {
      const { userId } = body;
      if (!userId) return fail('userId required');
      await deleteAuthUser(userId);
      return ok({});
    }

    // ── report queue ──────────────────────────────────────────────────
    if (action === 'list-reports') {
      const page = Math.max(1, Number(body.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(body.pageSize) || 20));
      const status = String(body.status || 'open').trim();
      const type = String(body.type || 'all').trim();
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = db
        .from('reports')
        .select('id, reporter_id, kind, target_type, target_id, target_title, reason, detail, status, resolution_note, resolved_at, resolved_by, created_at', { count: 'exact' })
        .order('kind', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (status !== 'all') q = q.eq('status', status);
      if (type !== 'all') {
        if (type === 'expert') q = q.eq('kind', 'expert');
        else q = q.eq('target_type', type);
      }

      const { data, count, error } = await q;
      if (error) return failLogged('admin-users.list-reports.query', error);

      const reports = await Promise.all((data ?? []).map(async (report: Record<string, unknown>) => {
        let content = null;
        const targetType = String(report.target_type || (report.kind === 'expert' ? 'expert' : ''));
        const targetId = report.target_id as string;

        if (targetType === 'post' && targetId) {
          const { data: post } = await db.from('posts').select('id, title, body, anonymous, author_id, created_at, profiles(name, email)').eq('id', targetId).maybeSingle();
          content = post;
        } else if (targetType === 'answer' && targetId) {
          const { data: answer } = await db.from('answers').select('id, body, anonymous, author_id, post_id, created_at, profiles(name, email)').eq('id', targetId).maybeSingle();
          content = answer;
        } else if (targetType === 'reply' && targetId) {
          const { data: reply } = await db.from('replies').select('id, body, anonymous, author_id, answer_id, created_at, profiles(name, email)').eq('id', targetId).maybeSingle();
          content = reply;
        } else if (targetType === 'expert' && targetId) {
          const { data: expert } = await db.from('profiles').select('id, name, email, phone, profession, expert_badge_title, expert_circle_id, verified, expert_badge_status, bio').eq('id', targetId).maybeSingle();
          content = expert;
        } else if (targetType === 'profile' && targetId) {
          const { data: profile } = await db.from('profiles').select('id, name, email, phone, profession, verified, bio').eq('id', targetId).maybeSingle();
          content = profile;
        }

        const { data: reporter } = await db.from('profiles').select('id, name, email').eq('id', report.reporter_id).maybeSingle();
        return { ...report, target_type: targetType, content, reporter };
      }));

      return ok({ reports, total: count ?? 0, page, pageSize });
    }

    if (action === 'resolve-report' || action === 'dismiss-report') {
      const reportId = body.reportId;
      const note = String(body.note || '').trim();
      if (!reportId) return fail('reportId required');

      const now = new Date().toISOString();
      const status = action === 'resolve-report' ? 'resolved' : 'dismissed';
      const { data, error } = await db
        .from('reports')
        .update({ status, resolution_note: note || null, resolved_at: now })
        .eq('id', reportId)
        .eq('status', 'open')
        .select('id')
        .maybeSingle();
      if (error) return failLogged(`admin-users.${action}.update`, error);
      if (!data) return fail('Report is not open');
      return ok({});
    }

    return fail('Unknown action');
  } catch (err) {
    return failLogged('admin-users.unhandled', err);
  }
});

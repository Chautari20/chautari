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
 */
import { fail, failLogged, MSG, ok, preflight, corsHeaders } from '../_shared/http.ts';
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
          'is_founding_member, newcomer, followers_count, created_at, updated_at',
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

    return fail('Unknown action');
  } catch (err) {
    return failLogged('admin-users.unhandled', err);
  }
});

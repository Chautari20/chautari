import { supabase } from '../supabase';

/**
 * Invoke the admin-users edge function and surface the real error message.
 * supabase.functions.invoke() wraps non-2xx in a generic FunctionsHttpError;
 * we extract the actual JSON body so the UI can show something useful.
 */
async function invoke(action, body = {}) {
  const { data, error } = await supabase.functions.invoke('admin-users', {
    body: { action, ...body },
  });

  if (error) {
    // FunctionsHttpError carries the response body in error.context
    let detail = error.message || 'Edge Function error';
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === 'function') {
        const json = await ctx.json();
        detail = json?.error || json?.message || detail;
      }
    } catch (_) { /* ignore */ }
    throw new Error(detail);
  }

  if (data && !data.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export async function listUsers({ page = 1, pageSize = 20, search = '' } = {}) {
  return invoke('list', { page, pageSize, search });
}

export async function suspendUser(userId, hours = 24) {
  return invoke('suspend', { userId, hours });
}

export async function banUser(userId) {
  return invoke('ban', { userId });
}

export async function restoreUser(userId) {
  return invoke('restore', { userId });
}

export async function deleteUser(userId) {
  return invoke('delete', { userId });
}

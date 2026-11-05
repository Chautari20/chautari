function verifyUrl(path: string): string {
  const sid = Deno.env.get('TWILIO_VERIFY_SERVICE_SID');
  if (!sid) throw new Error('twilio_unconfigured');
  return `https://verify.twilio.com/v2/Services/${sid}/${path}`;
}

function authHeader(): string {
  const account = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!account || !token) throw new Error('twilio_unconfigured');
  return `Basic ${btoa(`${account}:${token}`)}`;
}

export async function startSmsVerification(phoneE164: string): Promise<void> {
  const res = await fetch(verifyUrl('Verifications'), {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: phoneE164, Channel: 'sms' }),
  });
  if (!res.ok) throw new Error('twilio_start_failed');
}

export async function checkSmsVerification(phoneE164: string, code: string): Promise<boolean> {
  const res = await fetch(verifyUrl('VerificationCheck'), {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: phoneE164, Code: code }),
  });
  if (!res.ok) return false;
  const body = await res.json().catch(() => null);
  return body?.status === 'approved';
}

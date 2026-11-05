import { isTestModeEmail, TEST_CODE } from './codes.ts';

export function resolveOutboundCode(email: string, generatedCode: string, testMode: boolean): {
  code: string;
  send: boolean;
} {
  if (isTestModeEmail(email, testMode)) {
    return { code: TEST_CODE, send: false };
  }
  return { code: generatedCode, send: true };
}

export async function sendCodeEmail(to: string, code: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!apiKey || !from) throw new Error('email_unconfigured');

  const text = `Your Chautari code is ${code}. It expires in 10 minutes.`;
  const html = `<p>Your Chautari code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Your Chautari code',
      text,
      html,
    }),
  });
  if (!res.ok) throw new Error('email_send_failed');
}

export async function sendPhoneChangedNotice(to: string): Promise<void> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!apiKey || !from) throw new Error('email_unconfigured');

  const text = "Your Chautari phone number was changed. If this wasn't you, contact us.";
  const html = `<p>${text}</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Your Chautari phone number was changed',
      text,
      html,
    }),
  });
  if (!res.ok) throw new Error('email_send_failed');
}

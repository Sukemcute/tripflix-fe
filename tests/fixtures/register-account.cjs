const { setTimeout: delay } = require('node:timers/promises');

async function registerAccount(api, credentials) {
  const { email, password } = credentials;
  const { registrationId } = await api('/api/auth/registration-code', 'POST', { email, password });
  const mailbox = process.env.MAILPIT_PREVIEW_URL || 'http://localhost:8025';
  const search = new URL('/api/v1/search', mailbox);
  search.searchParams.set('query', `to:${email}`);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const result = await fetch(search);
    if (!result.ok) throw new Error(`Mailpit search failed (${result.status})`);
    const { messages } = await result.json();
    const latest = messages?.find((message) => message.Subject === 'Mã xác thực đăng ký Tripflix');
    if (latest) {
      const response = await fetch(new URL(`/api/v1/message/${latest.ID}`, mailbox));
      if (!response.ok) throw new Error(`Mailpit message failed (${response.status})`);
      const message = await response.json();
      const code = message.Text.match(/Mã xác thực: ([0-9]{8})/)?.[1];
      if (!code) throw new Error('Registration email is missing its code');
      return api('/api/auth/register', 'POST', { ...credentials, registrationId, code });
    }
    await delay(500);
  }
  throw new Error('Registration email did not arrive in Mailpit');
}

module.exports = { registerAccount };

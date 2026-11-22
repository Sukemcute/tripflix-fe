import { expect, it } from 'vitest';
import { POST } from '../../app/auth/google/mobile/route';
import { readMobileGoogleReturn } from './mobile-google-return';

const ID = 'abcdef0123456789abcd';
const state = (returnTo: string, requestId = ID) => new URLSearchParams({ s: requestId, r: returnTo }).toString();

it('nhận địa chỉ app tripflix:// và Expo Go trong LAN', () => {
  for (const returnTo of ['tripflix://login', 'exp://192.168.1.5:8081/--/login', 'exp://10.0.0.2:8081/--/login'])
    expect(readMobileGoogleReturn(state(returnTo))?.returnUrl).toBe(returnTo);
});

it('chặn địa chỉ lạ để token không bị gửi ra ngoài', () => {
  for (const returnTo of [
    'https://evil.test/login',
    'exp://abc-anonymous-8081.exp.direct/--/login',
    'exp://8.8.8.8:8081/--/login',
    'exp://172.32.0.1:8081/--/login',
    'javascript:alert(1)',
    'not a url',
  ])
    expect(readMobileGoogleReturn(state(returnTo))).toBeNull();
  expect(readMobileGoogleReturn(state('tripflix://login', 'short'))).toBeNull();
  expect(readMobileGoogleReturn(null)).toBeNull();
});

it('POST của Google chuyển ID token về app sau dấu #, state lạ thì 400', async () => {
  const post = (fields: Record<string, string>) =>
    POST(new Request('https://tripflix.io.vn/auth/google/mobile', { method: 'POST', body: new URLSearchParams(fields) }));

  const ok = await post({ state: state('tripflix://login#old'), id_token: 'token.value' });
  expect(ok.status).toBe(303);
  expect(ok.headers.get('Location')).toBe(`tripflix://login#state=${ID}&id_token=token.value`);

  const denied = await post({ state: state('tripflix://login'), error: 'access_denied' });
  expect(denied.headers.get('Location')).toBe(`tripflix://login#state=${ID}&error=access_denied`);

  expect((await post({ state: state('https://evil.test'), id_token: 'token.value' })).status).toBe(400);
});

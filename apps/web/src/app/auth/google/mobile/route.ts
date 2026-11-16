import { buildMobileGoogleRedirect, readMobileGoogleReturn } from '../../../../features/auth/mobile-google-return';

// Google gửi về đây (response_mode=form_post) khi app mobile đăng nhập Google qua trình duyệt (TF05H).
export async function POST(request: Request) {
  const form = await request.formData();
  const target = readMobileGoogleReturn(stringOrNull(form.get('state')));
  if (!target) return new Response('Yêu cầu đăng nhập không hợp lệ.', { status: 400 });
  const idToken = stringOrNull(form.get('id_token'));
  const outcome = idToken ? { idToken } : { error: stringOrNull(form.get('error')) ?? 'unknown' };
  return new Response(null, { status: 303, headers: { Location: buildMobileGoogleRedirect(target, outcome) } });
}

const stringOrNull = (value: FormDataEntryValue | null) => (typeof value === 'string' ? value : null);

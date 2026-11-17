const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3100').replace(/\/+$/, '');

/** Admin không có trang đăng nhập riêng: đăng nhập ở web, xong web chuyển về admin bằng mã một lần. */
export const WEB_LOGIN_URL = `${WEB_URL}/login?returnTo=admin`;
/** Sau khi đăng xuất admin: về trang chủ web, không về /login?returnTo=admin kẻo phiên web đưa thẳng vào lại. */
export const WEB_HOME_URL = WEB_URL;

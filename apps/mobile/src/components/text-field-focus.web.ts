import { explorer } from '@tripflix/tokens';

// Khung của app vẽ viền focus cho ô nhập. Ô đăng nhập cũng giữ màu nền khi trình duyệt tự điền.
const STYLE_ID = 'tripflix-text-field-focus';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    input:focus, textarea:focus { outline: none; }

    [id^="tripflix-auth-field-"] input:is(:autofill, :-webkit-autofill) {
      box-shadow: inset 0 0 0 100px ${explorer.day.canvas};
      -webkit-text-fill-color: ${explorer.day.text};
    }

    [id^="tripflix-auth-field-"] input:is(:autofill, :-webkit-autofill):focus {
      box-shadow: inset 0 0 0 100px ${explorer.day.surface};
    }
  `;
  document.head.appendChild(style);
}

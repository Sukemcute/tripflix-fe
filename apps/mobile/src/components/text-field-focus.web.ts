// Trình duyệt vẽ viền đen quanh ô nhập đang gõ, đè lên khung bo tròn của app. Ô nhập vẫn có con trỏ nhấp nháy
// và khung riêng, nên chỉ bỏ viền mặc định của ô chữ; nút và link giữ viền focus khi dùng bàn phím.
const STYLE_ID = 'tripflix-text-field-focus';

if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = 'input:focus, textarea:focus { outline: none; }';
  document.head.appendChild(style);
}

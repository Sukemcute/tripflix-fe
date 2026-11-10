# Thư viện Tripi trong frontend chính

Đã đưa trọn bộ từ `tripflix-ui-design/assets/tripi-library` vào repo frontend:

| App    | Asset                                     | Danh mục trong src                                |
| ------ | ----------------------------------------- | ------------------------------------------------- |
| Web    | `apps/web/public/brand/tripi-library/`    | `apps/web/src/features/mascot/tripi-assets.ts`    |
| Admin  | `apps/admin/public/brand/tripi-library/`  | `apps/admin/src/features/mascot/tripi-assets.ts`  |
| Mobile | `apps/mobile/assets/brand/tripi-library/` | `apps/mobile/src/features/mascot/tripi-assets.ts` |

Mỗi app có đủ **24 PNG** và **6 animation**, mỗi animation gồm WebP và WebM. Catalog, README và metadata gốc cũng được giữ lại. Bản prototype vẫn được giữ làm nguồn thiết kế.

## Web

Component dùng trực tiếp trong màn hình:

```tsx
import { TripiMascot } from '@/features/mascot/tripi-mascot';

<TripiMascot pose="action-plan" size={160} />
<TripiMascot animation="searching" size={120} />
<TripiMascot pose="expr-happy" size={64} alt="" />
```

Animation dùng WebP và tự chuyển sang PNG khi hệ điều hành yêu cầu giảm chuyển động. Chỉ định `alt=""` khi ảnh mang tính trang trí. Giữ tỷ lệ ảnh khi tùy chỉnh CSS.

Web và admin cũng có thể dùng trực tiếp danh mục với `next/image`:

```tsx
import { TRIPI_ASSETS, TRIPI_ANIMATIONS } from '@/features/mascot/tripi-assets';

<Image src={TRIPI_ASSETS['action-book'].src} alt="" width={140} height={140} />;
// WebP động: TRIPI_ANIMATIONS.success.src (dùng unoptimized với next/image).
// WebM: TRIPI_ANIMATIONS.success.webm (video muted loop playsInline).
// PNG thay thế: TRIPI_ASSETS[TRIPI_ANIMATIONS.success.fallback].src.
```

## Mobile

Danh mục dùng `require()` tĩnh để Metro đóng gói đúng toàn bộ ảnh:

```tsx
import { TRIPI_ASSETS } from '../mascot/tripi-assets';

<Image
  source={TRIPI_ASSETS['action-share'].source}
  contentFit="contain"
  style={{ width: 140, height: 140 }}
/>;
```

`TRIPI_ANIMATIONS` có `source` WebP và ID `fallback` cho PNG. Khi dùng animation trên mobile, chọn PNG nếu người dùng bật giảm chuyển động; WebM được giữ trong thư viện nhưng không tự đóng gói qua registry.

`TripiPose` liệt kê đủ 24 ID ảnh; `TripiAnimation` liệt kê `greeting`, `curious`, `excited`, `searching`, `departure`, `success`. Các component và đường dẫn mascot cũ vẫn hoạt động. Dùng registry mới để chọn các biểu cảm và tư thế bổ sung.

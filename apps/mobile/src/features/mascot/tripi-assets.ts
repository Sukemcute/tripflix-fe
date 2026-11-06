// Bộ Tripi đầy đủ; ID khớp catalog.json trong thư mục asset.
export const TRIPI_ASSETS = {
  'hero-welcome': {
    source: require('../../../assets/brand/tripi-library/hero-welcome.png'),
    label: 'Tripi chào đón',
    category: 'identity',
    use: 'Onboarding, chào người dùng',
  },
  'expr-curious': {
    source: require('../../../assets/brand/tripi-library/expr-curious.png'),
    label: 'Tò mò',
    category: 'expressions',
    use: 'Trợ lý, gợi ý, tìm kiếm',
  },
  'action-explore': {
    source: require('../../../assets/brand/tripi-library/action-explore.png'),
    label: 'Khám phá',
    category: 'activities',
    use: 'Khám phá địa điểm, màn chưa có chuyến',
  },
  'ui-success': {
    source: require('../../../assets/brand/tripi-library/ui-success.png'),
    label: 'Đặt chuyến thành công',
    category: 'ui',
    use: 'Xác nhận đơn, hoàn tất tác vụ',
  },
  'portrait-profile': {
    source: require('../../../assets/brand/tripi-library/portrait-profile.png'),
    label: 'Ảnh hồ sơ',
    category: 'identity',
    use: 'Hồ sơ nhân vật, ảnh đại diện',
  },
  'turn-front': {
    source: require('../../../assets/brand/tripi-library/turn-front.png'),
    label: 'Góc trước',
    category: 'turnaround',
    use: 'Tạo hình chuẩn, hồ sơ nhân vật',
  },
  'turn-left': {
    source: require('../../../assets/brand/tripi-library/turn-left.png'),
    label: 'Nghiêng trái',
    category: 'turnaround',
    use: 'Góc trái, chuyển cảnh',
  },
  'turn-back': {
    source: require('../../../assets/brand/tripi-library/turn-back.png'),
    label: 'Góc sau',
    category: 'turnaround',
    use: 'Balo, góc sau, lên đường',
  },
  'turn-right': {
    source: require('../../../assets/brand/tripi-library/turn-right.png'),
    label: 'Nghiêng phải',
    category: 'turnaround',
    use: 'Góc phải, chuyển cảnh',
  },
  'expr-happy': {
    source: require('../../../assets/brand/tripi-library/expr-happy.png'),
    label: 'Vui vẻ',
    category: 'expressions',
    use: 'Chào hỏi, phản hồi tích cực',
  },
  'expr-excited': {
    source: require('../../../assets/brand/tripi-library/expr-excited.png'),
    label: 'Phấn khích',
    category: 'expressions',
    use: 'Yêu thích, lưu hành trình',
  },
  'expr-confident': {
    source: require('../../../assets/brand/tripi-library/expr-confident.png'),
    label: 'Tự tin',
    category: 'expressions',
    use: 'Mẹo du lịch, gợi ý đã sẵn sàng',
  },
  'expr-relaxed': {
    source: require('../../../assets/brand/tripi-library/expr-relaxed.png'),
    label: 'Thư giãn',
    category: 'expressions',
    use: 'Nghỉ dưỡng, chờ nhẹ nhàng',
  },
  'expr-surprised': {
    source: require('../../../assets/brand/tripi-library/expr-surprised.png'),
    label: 'Bất ngờ',
    category: 'expressions',
    use: 'Thông báo, phát hiện mới',
  },
  'expr-effort': {
    source: require('../../../assets/brand/tripi-library/expr-effort.png'),
    label: 'Cố gắng',
    category: 'expressions',
    use: 'Đang tải lên, đang hoàn thành',
  },
  'expr-cheer': {
    source: require('../../../assets/brand/tripi-library/expr-cheer.png'),
    label: 'Cổ vũ',
    category: 'expressions',
    use: 'Cổ vũ chia sẻ, hoàn tất hồ sơ',
  },
  'action-vlog': {
    source: require('../../../assets/brand/tripi-library/action-vlog.png'),
    label: 'Quay vlog',
    category: 'activities',
    use: 'Đăng video, tạo bài chia sẻ',
  },
  'action-depart': {
    source: require('../../../assets/brand/tripi-library/action-depart.png'),
    label: 'Lên đường',
    category: 'activities',
    use: 'Chuyến sắp đi, chuẩn bị hành lý',
  },
  'action-vacation': {
    source: require('../../../assets/brand/tripi-library/action-vacation.png'),
    label: 'Nghỉ dưỡng',
    category: 'activities',
    use: 'Biển đảo, nghỉ dưỡng',
  },
  'action-plan': {
    source: require('../../../assets/brand/tripi-library/action-plan.png'),
    label: 'Lên lịch trình',
    category: 'activities',
    use: 'Lên lịch trình, trợ lý lập kế hoạch',
  },
  'action-book': {
    source: require('../../../assets/brand/tripi-library/action-book.png'),
    label: 'Đặt chuyến đi',
    category: 'activities',
    use: 'Giỏ chuyến, xác nhận dịch vụ',
  },
  'action-share': {
    source: require('../../../assets/brand/tripi-library/action-share.png'),
    label: 'Chia sẻ trải nghiệm',
    category: 'activities',
    use: 'Chia sẻ trải nghiệm',
  },
  'ui-searching': {
    source: require('../../../assets/brand/tripi-library/ui-searching.png'),
    label: 'Đang tìm chuyến',
    category: 'ui',
    use: 'Đang tìm chuyến hợp gu',
  },
  'icon-fox': {
    source: require('../../../assets/brand/tripi-library/icon-fox.png'),
    label: 'Biểu tượng cáo 2D',
    category: 'identity',
    use: 'Nhận diện nhỏ, phong cách 2D',
  },
} as const;

export type TripiPose = keyof typeof TRIPI_ASSETS;

export const TRIPI_ANIMATIONS = {
  greeting: {
    source: require('../../../assets/brand/tripi-library/animations/greeting.webp'),
    fallback: 'hero-welcome',
  },
  curious: {
    source: require('../../../assets/brand/tripi-library/animations/curious.webp'),
    fallback: 'expr-curious',
  },
  excited: {
    source: require('../../../assets/brand/tripi-library/animations/excited.webp'),
    fallback: 'expr-excited',
  },
  searching: {
    source: require('../../../assets/brand/tripi-library/animations/searching.webp'),
    fallback: 'ui-searching',
  },
  departure: {
    source: require('../../../assets/brand/tripi-library/animations/departure.webp'),
    fallback: 'action-depart',
  },
  success: {
    source: require('../../../assets/brand/tripi-library/animations/success.webp'),
    fallback: 'ui-success',
  },
} as const;

export type TripiAnimation = keyof typeof TRIPI_ANIMATIONS;

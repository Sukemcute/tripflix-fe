import { mobile } from './mobile';
import { demo } from './demo';
import { api } from './api';
import { commerce } from './commerce';
import { summary } from './summary';
import { hotel } from './hotel';
import { ota } from './ota';

// Chữ tiếng Việt hiện cho người dùng. Thêm khoá mới ở đây, không viết chữ thẳng trong component.
export const vi = {
  ota,
  hotel,
  summary,
  commerce,
  api,
  mobile,
  demo,
  app: {
    name: 'Tripflix',
    slogan: 'Chạm cảm hứng, trọn hành trình',
  },
  tabs: {
    feed: 'Lướt',
    explore: 'Khám phá',
    trips: 'Chuyến đi',
    inbox: 'Hộp thư',
    me: 'Tôi',
  },
  web: {
    heroTitle: 'Lướt video, chọn chuyến, đặt luôn',
    heroBody: 'Xem chuyến đi thật của người trẻ, rồi đặt phòng và vé theo đúng lộ trình đó.',
  },
  admin: {
    title: 'Tripflix Admin',
    overview: 'Tổng quan',
    moderation: 'Kiểm duyệt',
    analytics: 'Số liệu',
    inventory: 'Lịch trống & giá',
    orders: 'Đơn hàng',
    staff: 'Nhân sự',
  },
  common: {
    comingSoon: 'Đang xây dựng',
    retry: 'Thử lại',
    loading: 'Đang tải…',
  },
  booking: {
    holdExpiresIn: 'Giữ chỗ còn {time}',
    holdExpired: 'Đã hết thời gian giữ chỗ',
  },
} as const;

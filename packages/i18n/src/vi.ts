import { mobile } from './mobile';
import { assistant } from './assistant';
import { demo } from './demo';
import { api } from './api';
import { commerce } from './commerce';
import { summary } from './summary';
import { hotel } from './hotel';
import { ota } from './ota';
import { flights } from './flights';
import { privacy } from './privacy';
import { terms } from './terms';
import { moderation } from './moderation';
import { searchMonitoring } from './search-monitoring';

// Chữ tiếng Việt hiện cho người dùng. Thêm khoá mới ở đây, không viết chữ thẳng trong component.
export const vi = {
  searchMonitoring,
  assistant,
  moderation,
  flights,
  privacy,
  terms,
  ota,
  hotel,
  summary,
  commerce,
  api,
  mobile,
  demo,
  app: {
    name: 'Tripflix',
    slogan: 'Thấy là thích, nhích là đi',
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
    analytics: 'Xu hướng & Gian lận',
    searchMonitoring: 'Theo dõi tìm kiếm',
    inventory: 'Lịch trống & giá',
    orders: 'Đơn hàng & Thanh toán',
    users: 'Người dùng',
    alerts: 'Thông báo & Cảnh báo',
    audit: 'Nhật ký kiểm toán',
    reports: 'Báo cáo',
    staff: 'Phân quyền & Nhân sự',
    quickAccess: 'Truy cập nhanh',
    quickQueue: 'Hàng đợi kiểm duyệt',
    quickAbnormalOrders: 'Đơn hàng bất thường',
    quickCriticalAlerts: 'Cảnh báo nghiêm trọng',
    quickTodayReports: 'Báo cáo hôm nay',
  },
  common: {
    comingSoon: 'Đang xây dựng',
    retry: 'Thử lại',
    loading: 'Đang tải…',
    chooseOption: 'Chọn',
    chooseDate: 'Chọn ngày',
    previousMonth: 'Tháng trước',
    nextMonth: 'Tháng sau',
    monthYear: 'Tháng {month}, {year}',
    month: 'Tháng {month}',
    year: 'Năm',
    weekdaysShort: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
  },
  booking: {
    holdExpiresIn: 'Giữ chỗ còn {time}',
    holdExpired: 'Đã hết thời gian giữ chỗ',
  },
} as const;

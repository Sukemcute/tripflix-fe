// Trang /chinh-sach-bao-mat. Viết theo đúng dữ liệu hệ thống đang lưu; đổi cách lưu, gửi dữ liệu thì sửa trang này.
export const privacy = {
  title: 'Chính sách bảo mật',
  updated: 'Cập nhật ngày 09/11/2026',
  intro:
    'Tripflix là nền tảng xem video, chia sẻ trải nghiệm và đặt phòng, vé cho chuyến đi. Trang này cho biết chúng tôi thu thập dữ liệu nào, dùng vào việc gì và bạn có những quyền gì với dữ liệu của mình.',
  footerLink: 'Chính sách bảo mật',
  sections: {
    collect: {
      title: '1. Dữ liệu chúng tôi thu thập',
      account:
        'Tài khoản: email, tên hiển thị và mật khẩu. Mật khẩu chỉ được lưu dưới dạng mã băm (argon2id), không ai đọc lại được mật khẩu gốc.',
      google:
        'Đăng nhập bằng Google: Tripflix chỉ nhận mã định danh tài khoản Google, email và tên của bạn. Tripflix không nhận mật khẩu Google và không truy cập Gmail, Drive hay danh bạ.',
      profile:
        'Thông tin cá nhân: ngày sinh, giới tính, quốc tịch (bắt buộc khi đăng ký bằng email) và số điện thoại nếu bạn điền thêm. Chỉ bạn xem được các thông tin này, dùng để điền sẵn khi đặt phòng, vé. Chúng tôi cũng lưu thời điểm bạn đồng ý Điều khoản sử dụng.',
      content: 'Nội dung bạn đăng: bài viết, video, ảnh, bình luận, lượt thích và bài đã lưu.',
      booking:
        'Đặt chỗ: thông tin liên hệ và tên khách trong đơn, lịch sử đơn và thanh toán. Với thẻ, chúng tôi chỉ lưu 4 số cuối. Số thẻ đầy đủ do cổng thanh toán xử lý.',
      device:
        'Thiết bị và bảo mật: tên thiết bị, trình duyệt và địa chỉ IP của mỗi phiên đăng nhập, cùng nhật ký các thao tác quan trọng (đăng nhập, đổi mật khẩu). Dữ liệu này giúp bạn quản lý thiết bị và giúp chúng tôi chặn truy cập trái phép.',
    },
    use: {
      title: '2. Chúng tôi dùng dữ liệu vào việc gì',
      service: 'Tạo và duy trì tài khoản, cho bạn đăng nhập, đăng bài, đặt phòng, đặt vé và thanh toán.',
      email:
        'Gửi các email cần thiết: mã xác thực khi đăng ký, xác nhận email, đặt lại mật khẩu, chào mừng và thông tin đơn đặt chỗ.',
      personalize: 'Gợi ý điểm đến, nơi ở và bài viết hợp với sở thích của bạn.',
      safety:
        'Giới hạn số lần thử để chống spam, phát hiện đăng nhập bất thường và kiểm duyệt nội dung vi phạm.',
      noSale:
        'Chúng tôi không bán dữ liệu cá nhân và không dùng dữ liệu của bạn cho quảng cáo của bên thứ ba.',
    },
    share: {
      title: '3. Chia sẻ với bên thứ ba',
      intro: 'Chúng tôi chỉ chia sẻ phần dữ liệu cần thiết với các dịch vụ giúp vận hành Tripflix:',
      google: 'Google: đăng nhập bằng Google, gửi email qua Gmail và đặt máy chủ trên Google Cloud.',
      aws: 'Amazon Web Services: lưu và phát ảnh, video bạn tải lên.',
      payment: 'Cổng thanh toán (ví dụ VNPay): xử lý thanh toán khi bạn đặt chỗ.',
      law: 'Cơ quan nhà nước có thẩm quyền, khi pháp luật yêu cầu.',
    },
    keep: {
      title: '4. Lưu trữ và bảo vệ',
      body: 'Dữ liệu được lưu trên máy chủ của Tripflix và của các nhà cung cấp nêu trên, truyền qua HTTPS. Phiên đăng nhập, mã xác thực và liên kết đặt lại mật khẩu tự hết hạn và được xoá định kỳ. Dữ liệu tài khoản được giữ đến khi bạn yêu cầu xoá.',
    },
    rights: {
      title: '5. Quyền của bạn',
      view: 'Xem và sửa tên hiển thị, thông tin cá nhân trong trang Tài khoản.',
      devices: 'Xem các thiết bị đang đăng nhập và đăng xuất những thiết bị bạn không còn dùng.',
      delete:
        'Yêu cầu nhận bản sao hoặc xoá tài khoản cùng dữ liệu liên quan bằng cách gửi email cho chúng tôi.',
      google:
        'Gỡ quyền truy cập của Tripflix khỏi tài khoản Google bất cứ lúc nào tại myaccount.google.com/permissions.',
    },
    contact: {
      title: '6. Liên hệ',
      body: 'Nếu có câu hỏi về dữ liệu cá nhân hoặc muốn xoá tài khoản, hãy gửi email tới tripflixandgo@gmail.com. Chúng tôi sẽ trả lời trong vòng 7 ngày làm việc.',
    },
  },
} as const;

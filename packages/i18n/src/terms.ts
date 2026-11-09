// Trang /dieu-khoan-su-dung (TF06O). Bản nháp, cần nhóm đọc lại trước khi chạy thật.
// Đổi nội dung thì đổi cả `updated` và TERMS_VERSION ở Core API (access/auth/domain/registration.ts).
export const terms = {
  title: 'Điều khoản sử dụng',
  updated: 'Cập nhật ngày 09/11/2026',
  intro:
    'Điều khoản này là thoả thuận giữa bạn và Tripflix khi bạn tạo tài khoản, xem, đăng nội dung và đặt phòng, vé trên Tripflix. Vui lòng đọc kỹ trước khi đăng ký.',
  footerLink: 'Điều khoản sử dụng',
  sections: {
    accept: {
      title: '1. Chấp nhận điều khoản',
      body: 'Khi đánh dấu "Tôi đã đọc và đồng ý" lúc đăng ký hoặc tiếp tục dùng Tripflix, bạn đồng ý tuân theo Điều khoản sử dụng này và Chính sách bảo mật. Nếu không đồng ý, vui lòng không tạo tài khoản.',
    },
    account: {
      title: '2. Tài khoản và trách nhiệm của bạn',
      age: 'Bạn phải từ 13 tuổi trở lên để tạo tài khoản. Người dưới 18 tuổi nên có sự đồng ý của cha mẹ hoặc người giám hộ khi đặt chỗ, thanh toán.',
      accurate:
        'Bạn cam kết thông tin cung cấp (tên, email, ngày sinh, giới tính, quốc tịch) là đúng sự thật và tự chịu trách nhiệm về tính chính xác của thông tin đó, đặc biệt khi dùng để đặt vé, đặt phòng.',
      secure:
        'Bạn tự giữ bí mật mật khẩu và chịu trách nhiệm về mọi hoạt động diễn ra trong tài khoản của mình. Thấy đăng nhập lạ, hãy đổi mật khẩu và đăng xuất các thiết bị trong trang Tài khoản.',
      oneAccount:
        'Mỗi người chỉ dùng tài khoản của chính mình, không mua bán, cho thuê hay chuyển nhượng tài khoản.',
    },
    content: {
      title: '3. Nội dung bạn đăng',
      own: 'Bạn giữ quyền với bài viết, ảnh, video và bình luận mình đăng, và cho phép Tripflix hiển thị, lưu trữ, phân phối nội dung đó trên nền tảng.',
      responsible:
        'Bạn chịu trách nhiệm về nội dung mình đăng: không vi phạm pháp luật, bản quyền, quyền riêng tư của người khác, không chứa thông tin sai sự thật, xúc phạm, bạo lực hay khiêu dâm.',
      moderation:
        'Tripflix có thể ẩn hoặc gỡ nội dung vi phạm, tự động hoặc do người kiểm duyệt, và báo cho bạn biết lý do.',
    },
    booking: {
      title: '4. Đặt phòng, vé và thanh toán',
      info: 'Giá, tình trạng còn chỗ và điều kiện của từng phòng, vé hiện trên trang trước khi bạn thanh toán. Đơn chỉ được xác nhận sau khi thanh toán thành công.',
      cancel: 'Việc huỷ, đổi và hoàn tiền theo điều kiện ghi trên từng đơn và quy định của nhà cung cấp.',
      payment: 'Thanh toán được xử lý qua cổng thanh toán; Tripflix không lưu số thẻ đầy đủ của bạn.',
    },
    prohibited: {
      title: '5. Hành vi bị cấm',
      spam: 'Gửi spam, tạo nhiều tài khoản để lạm dụng ưu đãi, giả mạo người hoặc tổ chức khác.',
      attack:
        'Tấn công, dò quét, làm quá tải hệ thống hoặc tìm cách truy cập trái phép dữ liệu của người khác.',
      scrape: 'Thu thập dữ liệu tự động (bot, scraper) khi chưa được Tripflix cho phép.',
    },
    suspend: {
      title: '6. Tạm khoá và chấm dứt',
      body: 'Tripflix có thể tạm khoá hoặc chấm dứt tài khoản vi phạm Điều khoản này. Bạn có thể ngừng dùng và yêu cầu xoá tài khoản bất cứ lúc nào theo hướng dẫn trong Chính sách bảo mật.',
    },
    liability: {
      title: '7. Giới hạn trách nhiệm',
      body: 'Tripflix cố gắng giữ dịch vụ ổn định và thông tin chính xác, nhưng không bảo đảm dịch vụ luôn không gián đoạn. Nội dung do người dùng đăng thể hiện ý kiến của người đăng, không phải của Tripflix.',
    },
    changes: {
      title: '8. Thay đổi điều khoản',
      body: 'Khi Điều khoản thay đổi, chúng tôi cập nhật ngày ở đầu trang và thông báo trên ứng dụng. Tiếp tục dùng Tripflix sau thời điểm đó nghĩa là bạn đồng ý với bản mới.',
    },
    law: {
      title: '9. Luật áp dụng và liên hệ',
      body: 'Điều khoản này được hiểu và áp dụng theo pháp luật Việt Nam. Mọi câu hỏi xin gửi về tripflixandgo@gmail.com, chúng tôi trả lời trong vòng 7 ngày làm việc.',
    },
  },
} as const;

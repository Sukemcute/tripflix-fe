// Chữ cho thẻ title, description, Open Graph và JSON-LD (TF112). Máy tìm kiếm và link chia sẻ hiển thị các chuỗi này.
export const seo = {
  defaultTitle: 'Tripflix · Khám phá chuyến đi và đặt phòng theo lộ trình',
  defaultDescription:
    'Xem chuyến đi thật của người trẻ qua video và lộ trình chi tiết, rồi đặt phòng khách sạn, vé máy bay theo đúng hành trình đó trên Tripflix.',
  ogImageAlt: 'Tripflix · Thấy là thích, nhích là đi',
  home: 'Trang chủ',
  hotelTitle: '{name} · Giá tốt, đặt phòng nhanh',
  hotelTitleWithPlace: '{name}, {place} · Giá tốt, đặt phòng nhanh',
  hotelDescription: 'Xem ảnh, tiện nghi, đánh giá và giá phòng {name}. Đặt phòng nhanh trên Tripflix.',
  hotelDescriptionWithPlace:
    'Xem ảnh, tiện nghi, đánh giá và giá phòng {name} tại {place}. Đặt phòng nhanh trên Tripflix.',
  hotelFallbackTitle: 'Chi tiết khách sạn',
  tripPlanFallbackTitle: 'Lộ trình chuyến đi',
  tripPlanDescription:
    'Lộ trình {title} chia sẻ trên Tripflix: điểm đến, lịch trình từng ngày và chỗ ở để đặt theo.',
  profileTitle: '{name} trên Tripflix',
  profileDescription:
    'Xem video và lộ trình du lịch {name} chia sẻ trên Tripflix · {followers} người theo dõi.',
  profileFallbackTitle: 'Hồ sơ người dùng',
  priceRangeFrom: 'từ {price} VND',
} as const;

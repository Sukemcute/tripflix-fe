import type { HomeDestinationPickDto, HomeStayPickDto } from '@tripflix/api-client';
import {
  DEFAULT_DESTINATION_FALLBACK,
  DEFAULT_EXPERIENCE_FALLBACK,
  DEFAULT_STAY_FALLBACK,
  resolveDestinationExperienceImage,
  resolveDestinationSpotlightImage,
  resolveStayImage,
} from './ota-destination-assets';

export {
  DEFAULT_DESTINATION_FALLBACK as DEFAULT_DESTINATION_IMAGE,
  DEFAULT_EXPERIENCE_FALLBACK as DEFAULT_EXPERIENCE_IMAGE,
  DEFAULT_STAY_FALLBACK as DEFAULT_STAY_IMAGE,
};

/**
 * Cấu trúc dữ liệu cụm gợi ý thịnh hành trang chủ:
 * - Box 1 (Trái, lớn): Điểm đến tâm điểm & Lý do vì sao nên đi (Destination Spotlight & Reasons to visit)
 * - Box 2 (Phải trên): Nơi lưu trú & Deal giá tốt (Featured Stay & Deal)
 * - Box 3 (Phải dưới): Quán cà phê, Ẩm thực & Điểm check-in (Cafe & Local Experiences)
 */

export interface DestinationSpotlight {
  name: string;
  region: string;
  badge: string;
  description: string;
  meta: string;
  image: string;
  href: string;
}

export interface StayRecommendation {
  name: string;
  region: string;
  badge: string;
  stars: number;
  priceFrom: number;
  description: string;
  image: string;
  href: string;
  otherDealsCount?: number;
}

export interface ExperienceRecommendation {
  name: string;
  location: string;
  badge: string;
  ratingText: string;
  description: string;
  image?: string;
  href: string;
}

export interface RecommendationCombo {
  id: string;
  topicLabel: string;
  destination: DestinationSpotlight;
  stay: StayRecommendation;
  experience: ExperienceRecommendation;
}

export interface DestinationPreset {
  topicLabel: string;
  name: string;
  region: string;
  badge: string;
  description: string;
  meta: string;
  image: string;
  stayImage?: string;
  experience: {
    name: string;
    location: string;
    badge: string;
    ratingText: string;
    description: string;
    image?: string;
  };
}

/**
 * Kho dữ liệu lý do vì sao nên đi và hình ảnh thực tế cho các điểm đến nổi bật của Việt Nam.
 */
export const DESTINATION_PRESETS: Record<string, DestinationPreset> = {
  'phu-tho': {
    topicLabel: 'Phú Thọ · Đất Tổ & Đồi chè',
    name: 'Phú Thọ',
    region: 'Cội nguồn dân tộc Việt',
    badge: 'Về miền Đất Tổ',
    description:
      'Chiêm bái quần thể di tích Đền Hùng linh thiêng, ngắm "vịnh Hạ Long trung du" đồi chè Long Cốc bồng bềnh trong biển mây sớm và trải nghiệm hát Xoan di sản nghìn năm.',
    meta: '24°C · Mùa hành hương & đồi chè đẹp nhất',
    image: '/brand/destinations/phu-tho-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Đồi chè Long Cốc & Thịt chua Thanh Sơn',
      location: 'Tân Sơn · Thanh Sơn',
      badge: 'Điểm check-in & Ẩm thực',
      ratingText: '4.9 · Điểm đến yêu thích',
      description:
        'Chiêm ngưỡng đồi chè hình bát úp tuyệt mỹ và thưởng thức món thịt chua Thanh Sơn bùi thơm cuốn lá sung trứ danh.',
      image: '/brand/destinations/phu-tho-experience.jpg',
    },
  },
  'dong-nai': {
    topicLabel: 'Đồng Nai · Hồ Trị An & Rừng xanh',
    name: 'Đồng Nai',
    region: 'Miền Đông Nam Bộ',
    badge: 'Cắm trại & Dã ngoại',
    description:
      'Chèo SUP đón bình minh tĩnh lặng trên lòng hồ Trị An, trekking rừng nguyên sinh Vườn quốc gia Cát Tiên và cắm trại dã ngoại thư thái cuối tuần.',
    meta: '28°C · Mùa lý tưởng dã ngoại cuối tuần',
    image: '/brand/destinations/dong-nai-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Chèo SUP Hồ Trị An & Cá lăng nướng',
      location: 'Hồ Trị An · Vĩnh Cửu',
      badge: 'Trải nghiệm dã ngoại',
      ratingText: '4.8 · 1.2k đánh giá',
      description:
        'Cắm trại ven hồ lộng gió, ngắm hoàng hôn ngũ sắc rực rỡ và thưởng thức đặc sản cá lăng nướng muối ớt cay nồng.',
      image: '/brand/destinations/dong-nai-experience.jpg',
    },
  },
  'tay-ninh': {
    topicLabel: 'Tây Ninh · Đỉnh núi Bà & Biển mây',
    name: 'Tây Ninh',
    region: 'Nóc nhà Nam Bộ',
    badge: 'Chinh phục đỉnh thiêng',
    description:
      'Đi cáp treo săn biển mây đỉnh núi Bà Đen 986m kỳ vĩ, chiêm bái tượng Phật Bà Tây Bổ Đà Sơn bằng đồng cao nhất châu Á và viếng Tòa Thánh uy nghiêm.',
    meta: '27°C · Mùa săn mây & hành hương tâm linh',
    image: '/brand/destinations/tay-ninh-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Săn Mây & Bánh tráng Phơi Sương',
      location: 'Núi Bà Đen · Trảng Bàng',
      badge: 'Cà phê & Ẩm thực',
      ratingText: '4.9 · 2.4k đánh giá',
      description:
        'Thưởng thức tách cà phê giữa biển mây bồng bềnh và món bánh tráng phơi sương Trảng Bàng cuốn thịt luộc rau rừng nức tiếng.',
      image: '/brand/destinations/tay-ninh-experience.jpg',
    },
  },
  'quang-tri': {
    topicLabel: 'Quảng Trị · Dấu ấn lịch sử & Biển xanh',
    name: 'Quảng Trị',
    region: 'Vùng đất ký ức & Biển đảo',
    badge: 'Hành trình di sản lịch sử',
    description:
      'Viếng Thành Cổ thiêng liêng, khám phá kỳ tích địa đạo Vịnh Mốc bên bờ ghềnh đá và hòa mình vào làn nước biển trong vắt của đảo tiền tiêu Cồn Cỏ hoang sơ.',
    meta: '25°C · Thời tiết trong lành mát mẻ',
    image: '/brand/destinations/quang-tri-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Biển Cửa Tùng & Bánh lọc Mỹ Chánh',
      location: 'Cửa Tùng · Hải Lăng',
      badge: 'Cà phê & Ẩm thực',
      ratingText: '4.7 · 1.1k đánh giá',
      description:
        'Đón gió biển nguyên sơ tại bãi Cửa Tùng và thưởng thức bánh bột lọc, cháo vạt giường cay nồng đậm đà vị miền Trung.',
      image: '/brand/destinations/quang-tri-experience.jpg',
    },
  },
  'cao-bang': {
    topicLabel: 'Cao Bằng · Thác Bản Giốc hùng vĩ',
    name: 'Cao Bằng',
    region: 'Công viên Địa chất Toàn cầu UNESCO',
    badge: 'Non nước hữu tình',
    description:
      'Chiêm ngưỡng vẻ đẹp kỳ vĩ của thác Bản Giốc cuồn cuộn tung bọt trắng xóa giữa biên cương, khám phá động Ngườm Ngao thạch nhũ lung linh và hồ Thang Hen thơ mộng.',
    meta: '19°C · Mùa nước trong xanh thác Bản Giốc',
    image: '/brand/destinations/cao-bang-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Bản Giốc & Vịt quay 7 vị',
      location: 'Trùng Khánh · TP. Cao Bằng',
      badge: 'Ẩm thực & Điểm check-in',
      ratingText: '4.8 · 1.8k đánh giá',
      description:
        'Ngắm thác Bản Giốc hùng vĩ từ chòi ngắm cảnh và thưởng thức vịt quay 7 vị thơm lừng cùng hạt dẻ nướng Trùng Khánh bùi ngậy.',
      image: '/brand/destinations/cao-bang-experience.jpg',
    },
  },
  'can-tho': {
    topicLabel: 'Cần Thơ · Chợ nổi & Bến Ninh Kiều',
    name: 'Cần Thơ',
    region: 'Thủ phủ miền Tây sông nước',
    badge: 'Văn hóa sông nước',
    description:
      'Hòa mình vào nhịp sống chợ nổi Cái Răng tấp nập ghe thuyền lúc bình minh, dạo bến Ninh Kiều lung linh về đêm và lạc bước trong những vườn cây trái trĩu quả Phong Điền.',
    meta: '28°C · Mùa nổi & trái cây miệt vườn',
    image: '/brand/destinations/can-tho-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Hủ tiếu Chợ Nổi & Cà phê Bến Ninh Kiều',
      location: 'Chợ nổi Cái Răng · Ninh Kiều',
      badge: 'Cà phê & Ẩm thực sông nước',
      ratingText: '4.9 · 3.5k đánh giá',
      description:
        'Thưởng thức tô hủ tiếu nóng hổi ngay trên ghe chòng chành sóng nước và nhâm nhi cà phê ngắm hoàng hôn buông trên bến Ninh Kiều.',
      image: '/brand/destinations/can-tho-experience.jpg',
    },
  },
  'nha-trang': {
    topicLabel: 'Nha Trang · Biển & Ẩm thực',
    name: 'Nha Trang',
    region: 'Vịnh ngọc Khánh Hòa',
    badge: 'Xu hướng nổi bật',
    description:
      'Một buổi sáng lặn ngắm rạn san hô rực rỡ tại Hòn Mun, một chiều dạo biển ngập tràn nắng gió và thưởng ngoạn hoàng hôn buông lãng mạn trên vịnh ngọc.',
    meta: '28°C · Nắng ấm, biển êm quanh năm',
    image: '/brand/destinations/nha-trang-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Sailing Club & Hải sản Bờ Kè',
      location: 'Trần Phú · Tháp Bà',
      badge: 'Cà phê & Ẩm thực',
      ratingText: '4.9 · 1.4k đánh giá',
      description: 'Cocktail hoàng hôn bãi cát và tôm hùm tươi sống nướng bơ tỏi.',
      image: '/brand/destinations/nha-trang-experience.jpg',
    },
  },
  'khanh-hoa': {
    topicLabel: 'Khánh Hòa · Vịnh Cam Ranh & Biển ngọc',
    name: 'Nha Trang - Khánh Hòa',
    region: 'Vịnh biển đẹp bậc nhất thế giới',
    badge: 'Biển xanh vẫy gọi',
    description:
      'Đắm mình trong làn nước biển trong vắt của vịnh ngọc, khám phá vẻ đẹp hoang sơ của bán đảo Bình Lập và thư giãn tại các khu suối khoáng nóng tự nhiên.',
    meta: '28°C · Thời điểm lý tưởng tắm biển',
    image: '/brand/destinations/nha-trang-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Sailing Club & Hải sản Bờ Kè',
      location: 'Trần Phú · Nha Trang',
      badge: 'Cà phê biển & Hải sản',
      ratingText: '4.9 · 1.5k đánh giá',
      description: 'Ngắm biển lộng gió, cocktail bãi cát và hải sản tươi sống đánh bắt trong ngày.',
      image: '/brand/destinations/nha-trang-experience.jpg',
    },
  },
  'da-lat': {
    topicLabel: 'Đà Lạt · Săn mây & Cà phê',
    name: 'Đà Lạt',
    region: 'Cao nguyên ngàn hoa Lâm Đồng',
    badge: 'Săn mây mùa này',
    description:
      'Thức dậy giữa đồi thông mờ ảo, đón bình minh săn biển mây bồng bềnh và nhâm nhi ly cà phê thơm nồng trong tiết trời se lạnh đặc trưng cao nguyên.',
    meta: '16°C · Mùa săn mây & dã quỳ nở rộ',
    image: '/brand/destinations/da-lat-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Cheo Veooo & Bánh căn Lệ',
      location: 'Hoàng Hoa Thám · Tăng Bạt Hổ',
      badge: 'Cà phê & Điểm check-in',
      ratingText: '4.8 · 2.1k đánh giá',
      description: 'Săn biển mây sáng sớm và thưởng thức bánh căn xíu mại nóng giòn.',
      image: '/brand/destinations/da-lat-experience.jpg',
    },
  },
  'lam-dong': {
    topicLabel: 'Lâm Đồng · Đồi thông & Cao nguyên',
    name: 'Đà Lạt - Lâm Đồng',
    region: 'Cao nguyên Lang Biang hùng vĩ',
    badge: 'Săn mây mùa này',
    description:
      'Chiêm ngưỡng hồ Tuyền Lâm bảng lảng sương mù, trekking đỉnh Lang Biang hùng vĩ và trải nghiệm không gian sống chậm giữa rừng thông ngút ngàn.',
    meta: '16°C · Tiết trời mát lạnh lý tưởng',
    image: '/brand/destinations/da-lat-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Cheo Veooo & Bánh căn Lệ',
      location: 'Hoàng Hoa Thám · Đà Lạt',
      badge: 'Cà phê & Điểm check-in',
      ratingText: '4.9 · 2.2k đánh giá',
      description: 'Săn mây đón ánh bình minh và thưởng thức bánh căn xíu mại nóng hổi.',
      image: '/brand/destinations/da-lat-experience.jpg',
    },
  },
  'hoi-an': {
    topicLabel: 'Hội An · Phố cổ & Nét xưa',
    name: 'Hội An',
    region: 'Di sản văn hóa Quảng Nam',
    badge: 'Di sản thế giới',
    description:
      'Thong dong đạp xe qua những mái ngói rêu phong tường vàng, thả hoa đăng lung linh trên dòng sông Hoài thơ mộng và cảm nhận nét hoài niệm xưa cũ.',
    meta: '26°C · Mùa hoa đăng & phố đi bộ',
    image: '/brand/destinations/hoi-an-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Faifo Coffee & Bánh Mì Phượng',
      location: 'Trần Phú · Phan Châu Trinh',
      badge: 'Cà phê & Ẩm thực',
      ratingText: '4.9 · 3.2k đánh giá',
      description: 'Check-in sân thượng ngắm toàn cảnh mái ngói âm dương và ổ bánh mì giòn rụm.',
      image: '/brand/destinations/hoi-an-experience.jpg',
    },
  },
  'quang-nam': {
    topicLabel: 'Quảng Nam · Phố Hội & Mỹ Sơn',
    name: 'Hội An - Quảng Nam',
    region: 'Vùng đất 2 di sản thế giới',
    badge: 'Di sản văn hóa',
    description:
      'Khám phá thánh địa Mỹ Sơn cổ kính huyền bí, dạo bước trong phố cổ Hội An rực rỡ đèn lồng và thưởng thức cao lầu, mì Quảng đậm vị quê nhà.',
    meta: '26°C · Mùa lễ hội lung linh',
    image: '/brand/destinations/hoi-an-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Faifo Coffee & Mì Quảng Bà Mua',
      location: 'Trần Phú · Hội An',
      badge: 'Cà phê & Ẩm thực',
      ratingText: '4.9 · 2.8k đánh giá',
      description: 'Ngắm phố cổ từ ban công tầng cao và thưởng thức tô mì Quảng sợi vàng óng thơm ngon.',
      image: '/brand/destinations/hoi-an-experience.jpg',
    },
  },
  'phu-quoc': {
    topicLabel: 'Phú Quốc · Hoàng hôn & Nghỉ dưỡng',
    name: 'Phú Quốc',
    region: 'Đảo ngọc Kiên Giang',
    badge: 'Đảo ngọc mùa nắng',
    description:
      'Chiêm ngưỡng hoàng hôn ngũ sắc ngoạn mục tại bãi Sao cát mịn màng, lặn biển ngắm rạn san hô hoang sơ quần đảo An Thới và thưởng thức ẩm thực chợ đêm nức tiếng.',
    meta: '29°C · Biển lặng, thời điểm đẹp nhất năm',
    image: '/brand/destinations/phu-quoc-spotlight.jpg',
    stayImage: '/brand/destinations/phu-quoc-view.jpg',
    experience: {
      name: 'Chuồn Chuồn Bistro & Quán Ốc',
      location: 'Đồi Sao Mai · Bãi Sao',
      badge: 'Bistro & Ẩm thực',
      ratingText: '4.8 · 1.8k đánh giá',
      description: 'Ngắm toàn cảnh biển đảo từ trên cao và thưởng thức nhum biển nướng mỡ hành thơm nức.',
      image: '/brand/destinations/phu-quoc-experience.jpg',
    },
  },
  'kien-giang': {
    topicLabel: 'Kiên Giang · Đảo ngọc & Biển Tây',
    name: 'Phú Quốc - Kiên Giang',
    region: 'Vùng biển đảo Tây Nam',
    badge: 'Đảo ngọc mùa nắng',
    description:
      'Thiên đường nghỉ dưỡng biển đảo với làn nước xanh trong ngọc bích, bãi cát mịn trải dài và ẩm thực hải sản trù phú bậc nhất phương Nam.',
    meta: '29°C · Thời tiết đẹp, biển êm',
    image: '/brand/destinations/phu-quoc-spotlight.jpg',
    stayImage: '/brand/destinations/phu-quoc-view.jpg',
    experience: {
      name: 'Chuồn Chuồn Bistro & Hải sản Bãi Khem',
      location: 'Dương Đông · An Thới',
      badge: 'Bistro & Hải sản',
      ratingText: '4.8 · 1.9k đánh giá',
      description: 'Thưởng thức ghẹ Hàm Ninh tươi ngọt và ngắm biển hoàng hôn rực rỡ.',
      image: '/brand/destinations/phu-quoc-experience.jpg',
    },
  },
  'ha-noi': {
    topicLabel: 'Hà Nội · Phố cổ & Hồ Gươm',
    name: 'Hà Nội',
    region: 'Thủ đô ngàn năm văn hiến',
    badge: 'Tinh hoa văn hóa',
    description:
      'Dạo bước qua 36 phố phường rợp bóng cây xanh cổ thụ, đón bình minh hồ Gươm thanh bình và cảm nhận trọn vẹn nét thanh lịch, cổ kính của mảnh đất Thăng Long.',
    meta: '23°C · Mùa thu se lạnh lý tưởng dạo phố',
    image: '/brand/destinations/ha-noi-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Giảng & Phở Bát Đàn',
      location: 'Nguyễn Hữu Huân · Bát Đàn',
      badge: 'Cà phê & Ẩm thực phố cổ',
      ratingText: '4.9 · 4.5k đánh giá',
      description:
        'Thưởng thức ly cà phê trứng ngậy béo thơm lừng và bát phở gia truyền nước dùng ngọt thanh gia truyền.',
      image: '/brand/destinations/ha-noi-experience.jpg',
    },
  },
  'ho-chi-minh': {
    topicLabel: 'Sài Gòn · Năng động & Phố đêm',
    name: 'TP. Hồ Chí Minh',
    region: 'Đô thị hiện đại & sầm uất',
    badge: 'Nhịp sống không ngủ',
    description:
      'Khám phá các công trình kiến trúc biểu tượng Bưu điện trung tâm, Dinh Độc Lập, check-in Landmark 81 và hòa mình vào thiên đường ẩm thực đường phố sôi động về đêm.',
    meta: '30°C · Rực rỡ ánh đèn, đa dạng sự kiện',
    image: '/brand/destinations/ho-chi-minh-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Chung Cư & Cơm tấm Sài Gòn',
      location: '42 Nguyễn Huệ · Quận 1',
      badge: 'Cà phê góc phố & Ẩm thực',
      ratingText: '4.8 · 3.2k đánh giá',
      description:
        'Ngắm phố đi bộ sôi động từ ban công cà phê cổ và thưởng thức dĩa cơm tấm sườn nướng mỡ hành thơm nức.',
      image: '/brand/destinations/ho-chi-minh-experience.jpg',
    },
  },
  'da-nang': {
    topicLabel: 'Đà Nẵng · Biển Mỹ Khê & Cầu Rồng',
    name: 'Đà Nẵng',
    region: 'Thành phố đáng sống bậc nhất',
    badge: 'Điểm hẹn mùa hè',
    description:
      'Tắm biển Mỹ Khê bờ cát trắng mịn thoai thoải, ngắm cầu Rồng phun lửa rực sáng sông Hàn cuối tuần và khám phá Bán đảo Sơn Trà linh thiêng.',
    meta: '27°C · Nắng nhẹ, biển êm trong vắt',
    image: '/brand/sea.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Sơn Trà Marina & Bánh xèo Bà Dưỡng',
      location: 'Sơn Trà · Hoàng Diệu',
      badge: 'Cà phê biển & Đặc sản',
      ratingText: '4.8 · 2.9k đánh giá',
      description:
        'Check-in Santorini thu nhỏ ngắm trọn vịnh Đà Nẵng và thưởng thức bánh xèo giòn rụm chấm nước sốt gan béo bùi.',
      image: '/brand/home-surf.jpg',
    },
  },
  'quang-ninh': {
    topicLabel: 'Hạ Long · Kỳ quan đá vôi',
    name: 'Hạ Long - Quảng Ninh',
    region: 'Kỳ quan thiên nhiên thế giới UNESCO',
    badge: 'Kỳ quan đá vôi',
    description:
      'Du ngoạn giữa hàng nghìn đảo đá vôi kỳ vĩ trên vịnh ngọc bích, chèo kayak qua hang Luồn và ngắm hoàng hôn buông lộng lẫy trên boong tàu du thuyền.',
    meta: '24°C · Mùa du thuyền vịnh đẹp nhất',
    image: '/brand/destinations/quang-ninh-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Du Thuyền & Chả mực Hạ Long',
      location: 'Bãi Cháy · Tuần Châu',
      badge: 'Trải nghiệm vịnh & Ẩm thực',
      ratingText: '4.9 · 2.7k đánh giá',
      description:
        'Thưởng thức tách trà chiều giữa không gian kỳ vĩ của vịnh và món chả mực giã tay nóng hổi giòn sần sật.',
      image: '/brand/destinations/quang-ninh-experience.jpg',
    },
  },
  'ninh-binh': {
    topicLabel: 'Ninh Bình · Tràng An & Non nước',
    name: 'Ninh Bình',
    region: 'Quần thể Di sản Kép Tràng An',
    badge: 'Sơn thủy hữu tình',
    description:
      'Thả thuyền nan lướt nhẹ theo dòng sông qua các hang động kỳ thú Tràng An, Tam Cốc và chinh phục đỉnh Hang Múa ngắm trọn thung lũng sông núi kỳ vĩ.',
    meta: '22°C · Mùa non nước Tràng An đẹp nhất',
    image: '/brand/destinations/ninh-binh-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Đầm Sen & Cơm cháy Dê núi',
      location: 'Hoa Lư · Tràng An',
      badge: 'Cà phê ngắm cảnh & Ẩm thực',
      ratingText: '4.8 · 2.3k đánh giá',
      description:
        'Ngắm cảnh núi đá vôi non xanh nước biếc và thưởng thức đặc sản thịt dê núi nướng cùng cơm cháy giòn rụm.',
      image: '/brand/destinations/ninh-binh-experience.jpg',
    },
  },
  'lao-cai': {
    topicLabel: 'Sa Pa · Fansipan & Mây ngàn',
    name: 'Sa Pa - Lào Cai',
    region: 'Kỳ quan Tây Bắc hùng vĩ',
    badge: 'Nóc nhà Đông Dương',
    description:
      'Chinh phục đỉnh Fansipan 3.143m ngắm biển mây ngút ngàn, dạo bước qua bản Cát Cát mộc mạc và chiêm ngưỡng thung lũng Mường Hoa bảng lảng khói sương.',
    meta: '15°C · Tiết trời se lạnh mát mẻ quanh năm',
    image: '/brand/destinations/lao-cai-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Viettrekking & Lẩu Cá Hồi',
      location: 'Hoàng Liên · Fansipan',
      badge: 'Cà phê săn mây & Ẩm thực vùng cao',
      ratingText: '4.8 · 3.0k đánh giá',
      description:
        'Săn mây tàu hỏa leo núi Mường Hoa từ quán cà phê lưng đồi và thưởng thức nồi lẩu cá hồi, cá tầm nóng hổi thơm phức.',
      image: '/brand/destinations/lao-cai-view.jpg',
    },
  },
  'hue': {
    topicLabel: 'Huế · Cố đô & Sông Hương',
    name: 'Huế',
    region: 'Cố đô triều Nguyễn cổ kính',
    badge: 'Dấu ấn vàng son',
    description:
      'Chiêm ngưỡng vẻ đẹp uy nghiêm của Đại Nội, nghe ca Huế trên thuyền trôi nhẹ dòng sông Hương và thưởng thức nghệ thuật ẩm thực cung đình tinh tế.',
    meta: '25°C · Mùa cố đô thanh bình, dịu mát',
    image: '/brand/destinations/hue-spotlight.jpg',
    stayImage: '/brand/hotel.jpg',
    experience: {
      name: 'Cà phê Muối & Bún bò Mụ Rơi',
      location: 'Nguyễn Lương Bằng · Ngự Bình',
      badge: 'Cà phê đặc sản & Ẩm thực cố đô',
      ratingText: '4.9 · 3.3k đánh giá',
      description:
        'Thưởng thức hương vị cà phê muối béo ngậy trứ danh xứ Huế và tô bún bò đậm đà thơm mùi sả ruốc.',
      image: '/brand/destinations/hue-experience.jpg',
    },
  },
};

/**
 * Trả về thông tin preset đầy đủ cho một tỉnh/điểm đến.
 * Nếu chưa có sẵn trong danh mục, tự sinh nội dung du lịch hấp dẫn và tự động gán asset ảnh phù hợp.
 */
export function getDestinationPreset(slug: string, rawName: string): DestinationPreset {
  const normalizedSlug = slug.toLowerCase().trim();
  const existing = DESTINATION_PRESETS[normalizedSlug];
  if (existing) return existing;

  const cleanName = rawName.replace(/^Tỉnh\s+|^TP\.\s+/i, '').trim();
  const spotlightImage = resolveDestinationSpotlightImage(normalizedSlug);
  const expImage = resolveDestinationExperienceImage(normalizedSlug);

  return {
    topicLabel: `${cleanName} · Cảnh sắc & Khám phá`,
    name: cleanName,
    region: `Điểm đến đáng khám phá tại ${cleanName}`,
    badge: 'Khám phá mùa này',
    description: `Khám phá cảnh sắc thiên nhiên trong lành, di tích lịch sử văn hóa bản địa độc đáo và trải nghiệm ẩm thực đặc sản hấp dẫn tại ${cleanName}.`,
    meta: `Khám phá cẩm nang du lịch ${cleanName}`,
    image: spotlightImage,
    stayImage: DEFAULT_STAY_FALLBACK,
    experience: {
      name: `Ẩm thực & Điểm check-in ${cleanName}`,
      location: cleanName,
      badge: 'Cà phê & Ẩm thực',
      ratingText: '4.8 · Điểm đến yêu thích',
      description: `Thưởng thức các món ngon truyền thống và không gian cà phê thư thái đặc trưng của địa phương.`,
      image: expImage,
    },
  };
}

/**
 * Danh sách cụm gợi ý mặc định (fallback khi API chưa có dữ liệu)
 */
export const RECOMMENDATION_COMBOS: readonly RecommendationCombo[] = [
  {
    id: 'nha-trang',
    topicLabel: DESTINATION_PRESETS['nha-trang']!.topicLabel,
    destination: {
      name: DESTINATION_PRESETS['nha-trang']!.name,
      region: DESTINATION_PRESETS['nha-trang']!.region,
      badge: DESTINATION_PRESETS['nha-trang']!.badge,
      description: DESTINATION_PRESETS['nha-trang']!.description,
      meta: DESTINATION_PRESETS['nha-trang']!.meta,
      image: DESTINATION_PRESETS['nha-trang']!.image,
      href: '/search?placeId=nha-trang&q=Nha+Trang',
    },
    stay: {
      name: 'Amiana Resort Nha Trang',
      region: 'Vịnh Nha Trang · 5 sao',
      badge: 'Ưu đãi · Giảm 30%',
      stars: 5,
      priceFrom: 2450000,
      description: 'Hồ bơi nước biển 2.500m² và bãi cát trắng riêng tư nép mình bên vịnh biển.',
      image: '/brand/hotel.jpg',
      href: '/search?placeId=nha-trang',
      otherDealsCount: 3,
    },
    experience: {
      name: DESTINATION_PRESETS['nha-trang']!.experience.name,
      location: DESTINATION_PRESETS['nha-trang']!.experience.location,
      badge: DESTINATION_PRESETS['nha-trang']!.experience.badge,
      ratingText: DESTINATION_PRESETS['nha-trang']!.experience.ratingText,
      description: DESTINATION_PRESETS['nha-trang']!.experience.description,
      image: DESTINATION_PRESETS['nha-trang']!.experience.image,
      href: '/inspiration?q=Nha+Trang',
    },
  },
  {
    id: 'da-lat',
    topicLabel: DESTINATION_PRESETS['da-lat']!.topicLabel,
    destination: {
      name: DESTINATION_PRESETS['da-lat']!.name,
      region: DESTINATION_PRESETS['da-lat']!.region,
      badge: DESTINATION_PRESETS['da-lat']!.badge,
      description: DESTINATION_PRESETS['da-lat']!.description,
      meta: DESTINATION_PRESETS['da-lat']!.meta,
      image: DESTINATION_PRESETS['da-lat']!.image,
      href: '/search?placeId=da-lat&q=Đà+Lạt',
    },
    stay: {
      name: 'Dalat Edensee Lake Resort',
      region: 'Hồ Tuyền Lâm · 5 sao',
      badge: 'Ưu đãi · Giảm 35%',
      stars: 5,
      priceFrom: 1850000,
      description: 'Kiến trúc lâu đài giữa rừng thông bạt ngàn, view ôm trọn hồ Tuyền Lâm.',
      image: '/brand/hotel.jpg',
      href: '/search?placeId=da-lat',
      otherDealsCount: 3,
    },
    experience: {
      name: DESTINATION_PRESETS['da-lat']!.experience.name,
      location: DESTINATION_PRESETS['da-lat']!.experience.location,
      badge: DESTINATION_PRESETS['da-lat']!.experience.badge,
      ratingText: DESTINATION_PRESETS['da-lat']!.experience.ratingText,
      description: DESTINATION_PRESETS['da-lat']!.experience.description,
      image: DESTINATION_PRESETS['da-lat']!.experience.image,
      href: '/inspiration?q=Đà+Lạt',
    },
  },
  {
    id: 'hoi-an',
    topicLabel: DESTINATION_PRESETS['hoi-an']!.topicLabel,
    destination: {
      name: DESTINATION_PRESETS['hoi-an']!.name,
      region: DESTINATION_PRESETS['hoi-an']!.region,
      badge: DESTINATION_PRESETS['hoi-an']!.badge,
      description: DESTINATION_PRESETS['hoi-an']!.description,
      meta: DESTINATION_PRESETS['hoi-an']!.meta,
      image: DESTINATION_PRESETS['hoi-an']!.image,
      href: '/search?placeId=hoi-an&q=Hội+An',
    },
    stay: {
      name: 'Hội An Memories Resort',
      region: 'Cồn Hến · 4 sao',
      badge: 'Ưu đãi · Giảm 25%',
      stars: 4,
      priceFrom: 1620000,
      description: 'Nằm giữa dòng sông Hoài thơ mộng, tặng kèm vé xem show Ký Ức Hội An.',
      image: '/brand/hotel.jpg',
      href: '/search?placeId=hoi-an',
      otherDealsCount: 3,
    },
    experience: {
      name: DESTINATION_PRESETS['hoi-an']!.experience.name,
      location: DESTINATION_PRESETS['hoi-an']!.experience.location,
      badge: DESTINATION_PRESETS['hoi-an']!.experience.badge,
      ratingText: DESTINATION_PRESETS['hoi-an']!.experience.ratingText,
      description: DESTINATION_PRESETS['hoi-an']!.experience.description,
      image: DESTINATION_PRESETS['hoi-an']!.experience.image,
      href: '/inspiration?q=Hội+An',
    },
  },
  {
    id: 'phu-quoc',
    topicLabel: DESTINATION_PRESETS['phu-quoc']!.topicLabel,
    destination: {
      name: DESTINATION_PRESETS['phu-quoc']!.name,
      region: DESTINATION_PRESETS['phu-quoc']!.region,
      badge: DESTINATION_PRESETS['phu-quoc']!.badge,
      description: DESTINATION_PRESETS['phu-quoc']!.description,
      meta: DESTINATION_PRESETS['phu-quoc']!.meta,
      image: DESTINATION_PRESETS['phu-quoc']!.image,
      href: '/search?placeId=phu-quoc&q=Phú+Quốc',
    },
    stay: {
      name: 'Premier Village Phu Quoc',
      region: 'Mũi Ông Đội · 5 sao',
      badge: 'Ưu đãi · Giảm 22%',
      stars: 5,
      priceFrom: 3600000,
      description: 'Khu nghỉ dưỡng 2 mặt biển độc nhất ngắm trọn bình minh và hoàng hôn.',
      image: '/brand/destinations/phu-quoc-view.jpg',
      href: '/search?placeId=phu-quoc',
      otherDealsCount: 3,
    },
    experience: {
      name: DESTINATION_PRESETS['phu-quoc']!.experience.name,
      location: DESTINATION_PRESETS['phu-quoc']!.experience.location,
      badge: DESTINATION_PRESETS['phu-quoc']!.experience.badge,
      ratingText: DESTINATION_PRESETS['phu-quoc']!.experience.ratingText,
      description: DESTINATION_PRESETS['phu-quoc']!.experience.description,
      image: DESTINATION_PRESETS['phu-quoc']!.experience.image,
      href: '/inspiration?q=Phú+Quốc',
    },
  },
] as const;

/**
 * Rút gọn câu text lý do khách sạn thành badge ngắn gọn cho Box 2.
 */
function formatStayBadge(reason?: HomeStayPickDto['reason']): string {
  if (!reason) return 'Deal tốt nhất';
  if (reason.code === 'recent_place') {
    return 'Gợi ý cho bạn';
  }
  if (reason.text.includes('Rẻ hơn')) {
    const match = reason.text.match(/Rẻ hơn \d+%/i);
    if (match) return `Ưu đãi · ${match[0]}`;
  }
  return 'Giá tốt';
}

/**
 * Xây dựng danh sách combo gợi ý từ dữ liệu API.
 * Áp dụng cơ chế Fallback assets 4 tầng:
 * - Box 1: Ảnh phong cảnh điểm đến (từ API nếu có, hoặc FE asset registry)
 * - Box 2: Ảnh khách sạn (từ API nếu hợp lệ, hoặc FE fallback)
 * - Box 3: Ảnh cà phê/ẩm thực (từ API nếu có, hoặc FE asset registry)
 */
export function buildCombosFromApi(
  items: readonly HomeDestinationPickDto[],
  baseCombos: readonly RecommendationCombo[],
): RecommendationCombo[] {
  if (!items || items.length === 0) return [...baseCombos];

  const result: RecommendationCombo[] = [];
  const usedSlugs = new Set<string>();

  for (const item of items) {
    const slug = item.province.slug;
    if (usedSlugs.has(slug)) continue;
    usedSlugs.add(slug);

    const preset = getDestinationPreset(slug, item.province.name);
    const bestHotel = item.hotels && item.hotels.length > 0 ? item.hotels[0] : null;

    // Box 1: Điểm đến tâm điểm & lý do vì sao nên đi
    const destinationImage = resolveDestinationSpotlightImage(slug, preset.image);
    const isRecentPlace = bestHotel?.reason.code === 'recent_place';
    const destination: DestinationSpotlight = {
      name: preset.name,
      region: preset.region,
      badge: isRecentPlace ? 'Vì bạn vừa tìm' : preset.badge,
      description: preset.description,
      meta: preset.meta,
      image: destinationImage,
      href: `/search?placeId=${slug}&q=${encodeURIComponent(preset.name)}`,
    };

    // Box 2: Khách sạn & Ưu đãi giá tốt nhất
    const stayBadge = formatStayBadge(bestHotel?.reason);
    const stayDescription = bestHotel?.brand
      ? `Khách sạn thương hiệu ${bestHotel.brand} với dịch vụ chuẩn mực và tiện nghi cao cấp.`
      : bestHotel?.reason.text
      ? `${bestHotel.reason.text}. Vị trí trung tâm thuận tiện di chuyển tới các điểm tham quan.`
      : preset.description;

    const stayImage = resolveStayImage(slug, bestHotel?.thumbnail);
    const stayHref =
      item.otherDealsCount && item.otherDealsCount > 0
        ? `/search?placeId=${slug}`
        : `/search?placeId=${slug}&q=${encodeURIComponent(bestHotel?.name ?? preset.name)}`;

    const stay: StayRecommendation = {
      name: bestHotel?.name ?? `Khách sạn tại ${preset.name}`,
      region: `${preset.name}${bestHotel?.stars ? ` · ${bestHotel.stars} sao` : ''}`,
      badge: stayBadge,
      stars: bestHotel?.stars ?? 4,
      priceFrom: bestHotel?.priceFrom ?? 1_200_000,
      description: stayDescription,
      image: stayImage,
      href: stayHref,
      otherDealsCount: item.otherDealsCount,
    };

    // Box 3: Cà phê & Trải nghiệm địa phương
    const expImage = resolveDestinationExperienceImage(slug, preset.experience.image);
    const experience: ExperienceRecommendation = {
      name: preset.experience.name,
      location: preset.experience.location,
      badge: preset.experience.badge,
      ratingText: preset.experience.ratingText,
      description: preset.experience.description,
      image: expImage,
      href: `/inspiration?q=${encodeURIComponent(preset.name)}`,
    };

    result.push({
      id: slug,
      topicLabel: preset.topicLabel,
      destination,
      stay,
      experience,
    });
  }

  // Nếu kết quả từ API ít hơn 4, bổ sung thêm các combo mặc định chưa có
  for (const combo of baseCombos) {
    if (result.length >= 6) break;
    if (!usedSlugs.has(combo.id)) {
      result.push(combo);
      usedSlugs.add(combo.id);
    }
  }

  return result;
}

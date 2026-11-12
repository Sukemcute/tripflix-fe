import styles from './torn-paper.module.css';

/**
 * Các biến thể mép xé giấy (Torn Paper Edge Variants):
 * - hero-to-canvas: Mép xé giấy đại dương chuyển tiếp từ đáy Hero 3D xuống thanh tìm kiếm và thân trang.
 * - stay-top: Mép xé giấy chuyển tiếp vào dải vé du lịch Tripflix Ticket.
 * - stay-bottom: Mép xé giấy chuyển tiếp từ dải vé sang vùng phiêu lưu Tripi.
 * - stories-bottom: Mép xé giấy chuyển tiếp từ câu chuyện du lịch xuống chân trang.
 */
export type TornPaperVariant = 'hero-to-canvas' | 'stay-top' | 'stay-bottom' | 'stories-bottom';

interface TornPaperProps {
  variant?: TornPaperVariant;
  className?: string;
  flipY?: boolean;
}

export function TornPaperDivider({
  variant = 'hero-to-canvas',
  className = '',
  flipY = false,
}: TornPaperProps) {
  if (variant === 'hero-to-canvas') {
    return (
      <div
        className={`${styles.tornPaperWrapper} ${styles.heroDivider} ${className}`}
        aria-hidden="true"
        data-torn="hero"
      >
        <svg
          className={styles.tornSvg}
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Bóng đổ êm dịu tạo độ sâu giữa lớp ảnh đại dương và tờ giấy xé */}
            <filter id="tornHeroShadow" x="-5%" y="-20%" width="110%" height="160%">
              <feDropShadow dx="0" dy="-4" stdDeviation="6" floodColor="#002b36" floodOpacity="0.28" />
            </filter>
            <linearGradient id="deckleFiberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d2f2ed" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#eafaf7" stopOpacity="0.95" />
              <stop offset="70%" stopColor="#d9f4f1" stopOpacity="0.88" />
              <stop offset="100%" stopColor="#e1f7f4" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Lớp 1: Lớp bóng đổ sâu (Drop Shadow Underlayer) */}
          <path
            d="M 0,42
               C 35,46 65,39 105,43
               C 145,47 185,41 230,44
               C 275,47 315,38 360,42
               C 405,46 445,49 490,44
               C 535,39 575,45 620,43
               C 665,41 705,37 750,42
               C 795,47 835,49 880,44
               C 925,39 965,43 1010,41
               C 1055,39 1095,46 1140,43
               C 1185,40 1225,37 1270,42
               C 1315,47 1365,41 1405,45
               L 1440,43 L 1440,96 L 0,96 Z"
            fill="#013745"
            opacity="0.35"
            filter="url(#tornHeroShadow)"
          />

          {/* Lớp 2: Lớp xơ giấy rách tơi (Deckle Edge Rough Fibers) */}
          <path
            d="M 0,34
               C 24,37 48,32 72,36
               C 96,40 120,33 144,38
               C 168,43 192,36 216,35
               C 240,34 264,41 288,37
               C 312,33 336,39 360,35
               C 384,31 408,42 432,38
               C 456,34 480,41 504,36
               C 528,31 552,38 576,34
               C 600,30 624,39 648,36
               C 672,33 696,42 720,37
               C 744,32 768,40 792,35
               C 816,30 840,39 864,36
               C 888,33 912,41 936,37
               C 960,33 984,39 1008,35
               C 1032,31 1056,42 1080,38
               C 1104,34 1128,40 1152,36
               C 1176,32 1200,38 1224,34
               C 1248,30 1272,39 1296,36
               C 1320,33 1344,41 1368,37
               C 1392,33 1416,39 1440,35
               L 1440,96 L 0,96 Z"
            fill="url(#deckleFiberGrad)"
          />

          {/* Lớp 3: Thân giấy chính (Solid Front Paper Rip) - Khớp chính xác nền Sea Mist của Canvas */}
          <path
            d="M 0,44
               C 30,48 55,42 90,46
               C 125,50 160,43 200,45
               C 240,47 275,41 315,44
               C 355,47 390,52 430,47
               C 470,42 505,48 545,45
               C 585,42 620,39 660,44
               C 700,49 735,51 775,46
               C 815,41 850,45 890,43
               C 930,41 965,48 1005,45
               C 1045,42 1080,39 1120,44
               C 1160,49 1200,43 1240,46
               C 1280,49 1320,43 1360,47
               C 1395,50 1420,44 1440,46
               L 1440,96 L 0,96 Z"
            fill="var(--color-sea-mist, #E7F7F4)"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'stay-top') {
    return (
      <div
        className={`${styles.tornPaperWrapper} ${styles.stayTopDivider} ${className}`}
        aria-hidden="true"
        data-torn="stay-top"
      >
        <svg
          className={styles.tornSvg}
          viewBox="0 0 1440 68"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="stayTopDeckleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fdeee6" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#fff3ec" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#fbe9df" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Bóng đổ nhẹ từ mép trên */}
          <path
            d="M 0,22 C 80,14 160,26 240,20 C 340,12 420,24 520,18 C 620,12 700,26 800,19 C 900,12 980,24 1080,18 C 1180,12 1260,26 1360,20 L 1440,22 L 1440,68 L 0,68 Z"
            fill="rgba(0, 76, 68, 0.05)"
          />

          {/* Lớp xơ rách viền vé */}
          <path
            d="M 0,16
               C 35,21 70,14 105,19 C 140,24 175,15 210,18
               C 245,21 280,13 315,19 C 350,25 385,16 420,18
               C 455,20 490,14 525,19 C 560,24 595,15 630,17
               C 665,19 700,12 735,18 C 770,24 805,15 840,19
               C 875,23 910,14 945,18 C 980,22 1015,15 1050,17
               C 1085,19 1120,13 1155,18 C 1190,23 1225,14 1260,19
               C 1295,24 1330,15 1365,18 C 1400,21 1425,16 1440,19
               L 1440,68 L 0,68 Z"
            fill="url(#stayTopDeckleGrad)"
          />

          {/* Lớp mặt vé chính màu Warm Mist */}
          <path
            d="M 0,26
               C 45,31 85,24 130,28 C 175,32 215,25 260,29
               C 305,33 345,24 390,30 C 435,36 475,27 520,31
               C 565,35 605,26 650,29 C 695,32 735,24 780,30
               C 825,36 865,27 910,31 C 955,35 995,25 1040,29
               C 1085,33 1125,24 1170,29 C 1215,34 1255,26 1300,30
               C 1345,34 1390,26 1440,28
               L 1440,68 L 0,68 Z"
            fill="var(--color-warm-mist, #FFF7F2)"
          />
        </svg>
      </div>
    );
  }

  if (variant === 'stay-bottom') {
    return (
      <div
        className={`${styles.tornPaperWrapper} ${styles.stayBottomDivider} ${flipY ? styles.flipped : ''} ${className}`}
        aria-hidden="true"
        data-torn="stay-bottom"
      >
        <svg
          className={styles.tornSvg}
          viewBox="0 0 1440 68"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Mép xé chuyển tiếp từ dải vé Warm Mist sang dải phiêu lưu Tripi */}
          <path
            d="M 0,0 L 1440,0
               L 1440,36
               C 1395,32 1355,41 1310,36 C 1265,31 1225,42 1180,37
               C 1135,32 1095,41 1050,36 C 1005,31 965,40 920,36
               C 875,32 835,42 790,37 C 745,32 705,40 660,35
               C 615,30 575,41 530,36 C 485,31 445,41 400,36
               C 355,31 315,42 270,36 C 225,30 185,40 140,35
               C 95,30 50,39 0,34 Z"
            fill="var(--color-warm-mist, #FFF7F2)"
          />
          {/* Lớp xơ rách mép dưới vé */}
          <path
            d="M 0,34
               C 40,38 75,32 115,37 C 155,42 195,33 235,38
               C 275,43 315,34 355,38 C 395,42 435,33 475,37
               C 515,41 555,32 595,37 C 635,42 675,33 715,38
               C 755,43 795,34 835,38 C 875,42 915,33 955,37
               C 995,41 1035,32 1075,36 C 1115,40 1155,33 1195,37
               C 1235,41 1275,32 1315,37 C 1355,42 1400,34 1440,36
               L 1440,42
               C 1400,40 1355,48 1315,43 C 1275,38 1235,47 1195,43
               C 1155,39 1115,46 1075,42 C 1035,38 995,47 955,43
               C 915,39 875,48 835,44 C 795,40 755,49 715,44
               C 675,39 635,48 595,43 C 555,38 515,47 475,43
               C 435,39 395,48 355,44 C 315,40 275,49 235,44
               C 195,39 155,48 115,43 C 75,38 40,44 0,40 Z"
            fill="rgba(0, 108, 99, 0.08)"
          />
        </svg>
      </div>
    );
  }

  // stories-bottom: chuyển sang Footer
  return (
    <div
      className={`${styles.tornPaperWrapper} ${styles.footerDivider} ${className}`}
      aria-hidden="true"
      data-torn="footer"
    >
      <svg
        className={styles.tornSvg}
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M 0,32
             C 45,26 95,38 145,31 C 195,24 245,36 295,30
             C 345,24 395,37 445,31 C 495,25 545,37 595,30
             C 645,23 695,36 745,30 C 795,24 845,37 895,31
             C 945,25 995,36 1045,30 C 1095,24 1145,37 1195,31
             C 1245,25 1295,36 1345,30 C 1390,25 1420,33 1440,31
             L 1440,60 L 0,60 Z"
          fill="var(--color-navy, #141B3D)"
        />
      </svg>
    </div>
  );
}

/**
 * Hoa văn Bản đồ Địa hình Vector (Topographic Elevation Contours)
 * Tạo nét sang trọng của cuốn sổ tay du lịch / thám hiểm, chạy mờ ảo trên nền trang.
 */
export function TopographicContours({ className = '' }: { className?: string }) {
  return (
    <div className={`${styles.topoWrapper} ${className}`} aria-hidden="true">
      <svg
        className={styles.topoSvg}
        viewBox="0 0 1200 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.045" strokeDasharray="3 3">
          <ellipse cx="220" cy="240" rx="200" ry="140" />
          <ellipse cx="220" cy="240" rx="160" ry="110" />
          <ellipse cx="220" cy="240" rx="120" ry="80" />
          <ellipse cx="220" cy="240" rx="80" ry="50" />

          <path d="M -50,580 C 140,510 320,640 500,560 C 680,480 840,600 1020,530 C 1140,480 1220,540 1300,510" />
          <path d="M -50,620 C 140,550 320,680 500,600 C 680,520 840,640 1020,570 C 1140,520 1220,580 1300,550" />
          <path d="M -50,660 C 140,590 320,720 500,640 C 680,560 840,680 1020,610 C 1140,560 1220,620 1300,590" />

          <ellipse cx="980" cy="280" rx="240" ry="160" />
          <ellipse cx="980" cy="280" rx="190" ry="120" />
          <ellipse cx="980" cy="280" rx="140" ry="85" />
          <ellipse cx="980" cy="280" rx="90" ry="50" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Băng keo dán giấy Washi Tape phong cách Travel Scrapbook
 */
export function WashiTape({
  className = '',
  color = 'gold',
  angle = -3,
}: {
  className?: string;
  color?: 'gold' | 'coral' | 'teal';
  angle?: number;
}) {
  const colorMap = {
    gold: styles.tapeGold,
    coral: styles.tapeCoral,
    teal: styles.tapeTeal,
  };

  return (
    <div
      className={`${styles.washiTape} ${colorMap[color]} ${className}`}
      style={{ transform: `rotate(${angle}deg)` }}
      aria-hidden="true"
    />
  );
}

/**
 * Con dấu bưu điện du lịch (Travel Postmark Stamp)
 */
export function TravelPostmarkStamp({
  city = 'VIỆT NAM',
  year = '2026',
  className = '',
  rotate = -12,
}: {
  city?: string;
  year?: string;
  className?: string;
  rotate?: number;
}) {
  return (
    <div
      className={`${styles.postmarkStamp} ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <div className={styles.postmarkInner}>
        <span className={styles.postmarkTop}>TRIPFLIX POST</span>
        <span className={styles.postmarkCity}>{city}</span>
        <span className={styles.postmarkWave}>≈≈ ★ ≈≈</span>
        <span className={styles.postmarkDate}>OFFICIAL • {year}</span>
      </div>
    </div>
  );
}

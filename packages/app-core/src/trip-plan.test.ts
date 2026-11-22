import { describe, expect, it } from 'vitest';
import {
  applyTripPlanChoices,
  buildTripAttachment,
  buildTripDraftFromAttachment,
  getTripPlanCategory,
  guessTripPlanCategory,
  buildTripPlanCheckout,
  buildTripDraftFromOrder,
  createTripPlanDraft,
  createTripPlanPoint,
  isBookableTripPoint,
  moveTripPlanPoint,
  sortTripPlanPointsByTime,
  getBookableTripPlan,
  getTripPlanStays,
  findTripOutboundFlight,
  findPlaceAirport,
  findPlaceFlightRoute,
  planNextTripFlight,
  pickTripFlightDestination,
  getTripDayDate,
  getTripNights,
  hasTripPlan,
  pickCheapestOffer,
  listTripPlanOffers,
  getTripPlanTotal,
  isValidTripPlanPassengers,
  TRIP_PLAN_MAX_ITEMS,
} from './trip-plan';

const labels = {
  flight: 'Máy bay',
  bus: 'Xe khách',
  train: 'Tàu hoả',
  car: 'Ô tô',
  other: 'Khác',
} as const;

describe('trip plan', () => {
  it('dựng trip_attachment từ bản nháp: giữ thứ tự điểm, giờ hợp lệ, bỏ điểm trống', () => {
    expect(
      buildTripAttachment(
        {
          destinationName: ' Đà Lạt ',
          destinationPlaceId: 'da-lat',
          posterMediaId: 'img-1',
          bookingId: 'order-1',
          days: [
            {
              points: [
                createTripPlanPoint({ mode: 'flight', fromCode: 'SGN', toCode: 'DLI', time: '06:45' }),
                createTripPlanPoint({ title: 'Hồ Xuân Hương', location: 'Trung tâm', time: '25:00' }),
                createTripPlanPoint({ title: '  ' }),
              ],
            },
            {
              points: [
                createTripPlanPoint({ mode: 'bus', note: 'Nhà xe Phương Trang' }),
                createTripPlanPoint({
                  kind: 'hotel',
                  hotelId: 'h1',
                  title: 'Ana Mandara',
                  productId: 'h1--DLX',
                  ratePlanCode: 'RO',
                  roomName: 'Deluxe',
                }),
              ],
            },
          ],
        },
        labels,
      ),
    ).toEqual({
      daysCount: 2,
      destinationName: 'Đà Lạt',
      destinationPlaceId: 'da-lat',
      hotelId: 'h1',
      hotelName: 'Ana Mandara',
      hotelProductId: 'h1--DLX',
      hotelRatePlanCode: 'RO',
      posterMediaId: 'img-1',
      bookingId: 'order-1',
      items: [
        {
          day: 1,
          title: 'Máy bay SGN → DLI',
          time: '06:45',
          transport: { mode: 'flight', fromAirport: 'SGN', toAirport: 'DLI' },
        },
        { day: 1, title: 'Hồ Xuân Hương', location: 'Trung tâm' },
        { day: 2, title: 'Xe khách', notes: 'Nhà xe Phương Trang', transport: { mode: 'bus' } },
        {
          day: 2,
          title: 'Ana Mandara',
          notes: 'Deluxe',
          hotel: { hotelId: 'h1', productId: 'h1--DLX', ratePlanCode: 'RO' },
        },
      ],
    });
    expect(buildTripAttachment(createTripPlanDraft(), labels)).toBeNull();
  });

  it('sắp lại điểm trong ngày: kéo đổi chỗ và sắp theo giờ', () => {
    const [a, b, c] = [
      createTripPlanPoint({ title: 'A', time: '16:30' }),
      createTripPlanPoint({ title: 'B' }),
      createTripPlanPoint({ title: 'C', time: '06:00' }),
    ];
    expect(moveTripPlanPoint({ points: [a!, b!, c!] }, 2, 0).points.map((p) => p.title)).toEqual([
      'C',
      'A',
      'B',
    ]);
    expect(moveTripPlanPoint({ points: [a!, b!] }, 0, 5).points.map((p) => p.title)).toEqual(['A', 'B']);
    expect(sortTripPlanPointsByTime({ points: [a!, b!, c!] }).points.map((p) => p.title)).toEqual([
      'C',
      'A',
      'B',
    ]);
    expect(a!.key).not.toBe(b!.key);
  });

  it('chặng bay đủ mã sân bay mới đặt được', () => {
    expect(isBookableTripPoint(createTripPlanPoint({ mode: 'flight', fromCode: 'SGN', toCode: 'CXR' }))).toBe(
      true,
    );
    expect(isBookableTripPoint(createTripPlanPoint({ mode: 'flight', fromCode: 'SGN', toCode: 'SGN' }))).toBe(
      false,
    );
    expect(isBookableTripPoint(createTripPlanPoint({ mode: 'bus', fromCode: 'SGN', toCode: 'CXR' }))).toBe(
      false,
    );
    expect(isBookableTripPoint(createTripPlanPoint({ title: 'Cáp treo' }))).toBe(false);
  });

  it('dựng bản nháp từ chuyến đã đi: vé bay đúng ngày, khách sạn thành chỗ ở', () => {
    const draft = buildTripDraftFromOrder({
      orderId: 'order-1',
      startDate: '2026-12-01',
      endDate: '2026-12-03',
      items: [
        {
          productType: 'flight',
          productName: 'VJ135',
          fromAirport: 'SGN',
          toAirport: 'CXR',
          date: '2026-12-01',
        },
        {
          productType: 'room',
          productName: 'Deluxe',
          propertyId: 'P-1',
          propertyName: 'Vinpearl',
          date: '2026-12-01',
        },
        {
          productType: 'flight',
          productName: 'VJ136',
          fromAirport: 'CXR',
          toAirport: 'SGN',
          date: '2026-12-03',
        },
        { productType: 'flight', productName: 'thiếu sân bay', date: '2026-12-02' },
      ],
    });
    expect(draft.bookingId).toBe('order-1');
    expect(
      draft.days.map((day) =>
        day.points.map((p) =>
          p.kind === 'hotel' ? `ks:${p.hotelId}` : p.mode ? `${p.fromCode}-${p.toCode}` : 'trống',
        ),
      ),
    ).toEqual([['SGN-CXR', 'ks:P-1'], ['trống'], ['CXR-SGN']]);
    expect(buildTripAttachment(draft, labels)?.items).toContainEqual({
      day: 1,
      title: 'Vinpearl',
      time: '14:00',
      notes: 'Deluxe',
      hotel: { hotelId: 'P-1' },
    });
    expect(buildTripAttachment(draft, labels)?.items).toHaveLength(3);
  });

  it('điểm khách sạn đặt được khi đã chọn khách sạn, gửi lên như một mục trong ngày', () => {
    const hotel = createTripPlanPoint({ kind: 'hotel', hotelId: 'P-1', title: 'Vinpearl', mode: 'bus' });
    expect(isBookableTripPoint(hotel)).toBe(true);
    expect(isBookableTripPoint(createTripPlanPoint({ kind: 'hotel' }))).toBe(false);
    const draft = { ...createTripPlanDraft(), days: [{ points: [hotel] }] };
    expect(buildTripAttachment(draft, labels)?.items).toEqual([
      { day: 1, title: 'Vinpearl', hotel: { hotelId: 'P-1' } },
    ]);
  });

  it('cho đặt riêng vé hoặc phòng và giữ các chặng tự túc', () => {
    const flight = { day: 1, transport: { mode: 'flight', fromAirport: 'SGN', toAirport: 'DLI' } } as const;
    expect(getBookableTripPlan({})).toBeNull();
    expect(getBookableTripPlan({ items: [{ day: 1, transport: { mode: 'bus' } }] })).toBeNull();
    expect(getBookableTripPlan({ hotelId: 'h', items: [{ day: 1 }] })).toEqual({
      hotels: [{ id: 'hotel0', day: 1, nights: 1, hotelId: 'h' }],
      flights: [],
      selfArranged: [],
    });
    expect(getBookableTripPlan({ items: [flight] })).toEqual({
      hotels: [],
      flights: [{ day: 1, from: 'SGN', to: 'DLI' }],
      selfArranged: [],
    });
    expect(
      getBookableTripPlan({
        hotelId: 'h',
        items: [
          flight,
          { day: 2, title: 'Xe đến biển', transport: { mode: 'bus' } },
          { day: 3, title: 'Bay tự đặt', transport: { mode: 'flight' } },
        ],
      }),
    ).toEqual({
      hotels: [{ id: 'hotel0', day: 1, nights: 2, hotelId: 'h' }],
      flights: [{ day: 1, from: 'SGN', to: 'DLI' }],
      selfArranged: [
        { day: 2, title: 'Xe đến biển', mode: 'bus' },
        { day: 3, title: 'Bay tự đặt', mode: 'flight' },
      ],
    });
  });

  it('không tra vé có mã sân bay hoặc ngày không hợp lệ', () => {
    for (const transport of [
      { mode: 'flight' as const, fromAirport: 'sgn', toAirport: 'DLI' },
      { mode: 'flight' as const, fromAirport: 'SGN', toAirport: 'SGN' },
      { mode: 'flight' as const, fromAirport: 'SGN', toAirport: 'XX' },
      { mode: 'train' as const },
      { mode: 'car' as const },
      { mode: 'other' as const },
    ]) {
      expect(getBookableTripPlan({ hotelId: 'h', items: [{ day: 1, transport }] })).toEqual({
        hotels: [{ id: 'hotel0', day: 1, nights: 1, hotelId: 'h' }],
        flights: [],
        selfArranged: [{ day: 1, mode: transport.mode }],
      });
    }
    for (const day of [0, 31, 1.5]) {
      expect(
        getBookableTripPlan({
          items: [{ day, transport: { mode: 'flight', fromAirport: 'SGN', toAirport: 'DLI' } }],
        }),
      ).toBeNull();
    }
  });

  it('sắp chặng theo ngày và giữ giới hạn số mục', () => {
    const leg = (day: number) => ({
      day,
      transport: { mode: 'flight' as const, fromAirport: 'SGN', toAirport: 'DLI' },
    });
    expect(getBookableTripPlan({ items: [leg(3), leg(1)] })?.flights.map((flight) => flight.day)).toEqual([
      1, 3,
    ]);
    expect(
      getBookableTripPlan({
        hotelId: 'h',
        items: Array.from({ length: TRIP_PLAN_MAX_ITEMS }, (_, index) => leg(index + 1)),
      }),
    ).toBeNull();
    expect(
      getBookableTripPlan({
        hotelId: 'h',
        items: Array.from({ length: TRIP_PLAN_MAX_ITEMS - 1 }, (_, index) => leg(index + 1)),
      }),
    ).not.toBeNull();
  });

  it('liệt kê mọi giá vé và phòng còn bán theo giá tăng dần', () => {
    const offers = [
      { productId: 'sold', isAvailable: false, plans: [{ code: 'X', totalPrice: 1 }] },
      {
        productId: 'a',
        isAvailable: true,
        plans: [
          { code: 'BB', totalPrice: 400 },
          { code: 'RO', totalPrice: 200 },
        ],
      },
      {
        productId: 'b',
        isAvailable: true,
        plans: [
          { code: 'Y', totalPrice: 300 },
          { code: 'N', totalPrice: null },
          { code: 'bad', totalPrice: NaN },
          { code: 'negative', totalPrice: -1 },
        ],
      },
    ];
    expect(listTripPlanOffers(offers)).toEqual([
      { productId: 'a', ratePlanCode: 'RO', totalPrice: 200 },
      { productId: 'b', ratePlanCode: 'Y', totalPrice: 300 },
      { productId: 'a', ratePlanCode: 'BB', totalPrice: 400 },
    ]);
    expect(offers[1]!.plans[0]!.totalPrice).toBe(400);
    expect(listTripPlanOffers([])).toEqual([]);
  });

  it('chỉ cộng các mục được chọn và có giá, kể cả giá bằng không', () => {
    const offer = { productId: 'a', ratePlanCode: 'RO', totalPrice: 200 };
    expect(
      getTripPlanTotal([
        { isSelected: true, offer },
        { isSelected: false, offer },
        { isSelected: true, offer: null },
      ]),
    ).toBe(200);
    expect(getTripPlanTotal([])).toBe(0);
    expect(getTripPlanTotal([{ isSelected: true, offer: { ...offer, totalPrice: 0 } }])).toBe(0);
  });

  it('kiểm tra người lớn, trẻ em chiếm ghế và em bé ngồi lòng', () => {
    expect(isValidTripPlanPassengers({ adults: 1, children: 8, infants: 1 }, 9)).toBe(true);
    for (const passengers of [
      { adults: 0, children: 1, infants: 0 },
      { adults: 2, children: 8, infants: 0 },
      { adults: 1, children: 0, infants: 2 },
      { adults: 1.5, children: 0, infants: 0 },
      { adults: 1, children: -1, infants: 0 },
      { adults: 1, children: 0, infants: NaN },
    ])
      expect(isValidTripPlanPassengers(passengers, 9)).toBe(false);
  });

  it('mỗi điểm khách sạn là một chặng ở, tới khách sạn kế tiếp hoặc hết chuyến', () => {
    const plan = getBookableTripPlan({
      hotelId: 'h1',
      daysCount: 6,
      items: [
        { day: 1, title: 'Ana Mandara', hotel: { hotelId: 'h1', productId: 'h1--DLX', ratePlanCode: 'RO' } },
        { day: 2, title: 'Ana Mandara', hotel: { hotelId: 'h1' } },
        { day: 3, title: 'Vinpearl', hotel: { hotelId: 'h2' } },
        { day: 5, title: 'Sai', hotel: { hotelId: 'h3' } },
        { day: 5, title: 'Mường Thanh', hotel: { hotelId: 'h4' } },
      ],
    });
    expect(plan?.hotels).toEqual([
      {
        id: 'hotel0',
        day: 1,
        nights: 2,
        hotelId: 'h1',
        hotelName: 'Ana Mandara',
        productId: 'h1--DLX',
        ratePlanCode: 'RO',
      },
      { id: 'hotel1', day: 3, nights: 2, hotelId: 'h2', hotelName: 'Vinpearl' },
      { id: 'hotel2', day: 5, nights: 1, hotelId: 'h4', hotelName: 'Mường Thanh' },
    ]);
  });

  it('bài cũ chỉ có khách sạn của chuyến thì ở từ ngày 1 tới hết chuyến', () => {
    expect(
      getTripPlanStays({ hotelId: 'h', hotelProductId: 'P', hotelRatePlanCode: 'RO', daysCount: 4 }),
    ).toEqual([{ id: 'hotel0', day: 1, nights: 3, hotelId: 'h', productId: 'P', ratePlanCode: 'RO' }]);
  });

  it('ở tới sáng ngày cuối, ít nhất một đêm', () => {
    expect(getTripNights(1)).toBe(1);
    expect(getTripNights(3)).toBe(2);
  });

  it('chỉ coi là có lộ trình khi có lịch từng ngày hoặc chỗ ở', () => {
    expect(hasTripPlan(null)).toBe(false);
    expect(hasTripPlan({})).toBe(false);
    expect(hasTripPlan({ items: [], hotelId: null })).toBe(false);
    expect(hasTripPlan({ items: [{ day: 1 }] })).toBe(true);
    expect(hasTripPlan({ hotelId: 'h' })).toBe(true);
  });

  it('tính ngày theo ngày khởi hành, qua tháng và năm', () => {
    expect(getTripDayDate('2026-12-30', 1)).toBe('2026-12-30');
    expect(getTripDayDate('2026-12-30', 3)).toBe('2027-01-01');
    expect(getTripDayDate('2027-02-28', 2)).toBe('2027-03-01');
  });

  it('chọn lựa chọn rẻ nhất còn bán, bỏ qua hết chỗ và giá trống', () => {
    expect(
      pickCheapestOffer([
        { productId: 'sold-out', isAvailable: false, plans: [{ code: 'RO', totalPrice: 100 }] },
        {
          productId: 'deluxe',
          isAvailable: true,
          plans: [
            { code: 'BB', totalPrice: 900 },
            { code: 'RO', totalPrice: null },
          ],
        },
        { productId: 'standard', isAvailable: true, plans: [{ code: 'RO', totalPrice: 700 }] },
      ]),
    ).toEqual({ productId: 'standard', ratePlanCode: 'RO', totalPrice: 700 });
    expect(
      pickCheapestOffer([{ productId: 'x', isAvailable: true, plans: [{ code: 'RO', totalPrice: null }] }]),
    ).toBeNull();
  });

  it('ghép vé bay và phòng vào một đơn, chỉ gửi trẻ em khi có vé bay', () => {
    const rooms = [{ productId: 'P1', ratePlanCode: 'BB', checkIn: '2026-12-01', checkOut: '2026-12-03' }];
    const flights = [{ productId: 'F1', ratePlanCode: 'ECO', date: '2026-12-01' }];
    expect(
      buildTripPlanCheckout({ adults: 2, children: 1, infants: 1, sourcePostId: 'post', flights, rooms }),
    ).toEqual({
      adults: 2,
      children: 1,
      infants: 1,
      sourcePostId: 'post',
      items: [
        { productId: 'F1', checkIn: '2026-12-01', ratePlanCode: 'ECO' },
        { productId: 'P1', checkIn: '2026-12-01', checkOut: '2026-12-03', ratePlanCode: 'BB' },
      ],
    });
    expect(
      buildTripPlanCheckout({ adults: 2, children: 1, sourcePostId: 'post', flights: [], rooms }),
    ).not.toHaveProperty('children');
    expect(
      buildTripPlanCheckout({ adults: 2, infants: 1, sourcePostId: 'post', flights: [], rooms }),
    ).not.toHaveProperty('infants');
    expect(
      buildTripPlanCheckout({ adults: 2, infants: 1, sourcePostId: 'post', flights, rooms: [] }),
    ).toMatchObject({ infants: 1, items: [{ productId: 'F1' }] });
    expect(() =>
      buildTripPlanCheckout({ adults: 1, sourcePostId: 'post', flights: [], rooms: [] }),
    ).toThrow();
  });

  it('đổi sân bay nhà ở cả chiều đi lẫn chiều về và đổi khách sạn', () => {
    const plan = {
      hotels: [{ id: 'hotel0', day: 1, nights: 3, hotelId: 'h1', productId: 'P', ratePlanCode: 'RO' }],
      flights: [
        { day: 1, from: 'SGN', to: 'CXR' },
        { day: 4, from: 'CXR', to: 'SGN' },
      ],
    };
    expect(
      applyTripPlanChoices(plan, { homeAirport: 'HAN', hotels: { hotel0: { id: 'h2', name: 'Vinpearl' } } }),
    ).toEqual({
      hotels: [{ id: 'hotel0', day: 1, nights: 3, hotelId: 'h2', hotelName: 'Vinpearl' }],
      flights: [
        { day: 1, from: 'HAN', to: 'CXR' },
        { day: 4, from: 'CXR', to: 'HAN' },
      ],
    });
    expect(applyTripPlanChoices(plan, {})).toEqual(plan);
  });
});

describe('chặng bay theo điểm đến (TF105)', () => {
  const destinations = [
    { code: 'DLI', name: 'Đà Lạt' },
    { code: 'CXR', name: 'Nha Trang / Cam Ranh' },
  ];
  it('lấy sân bay khớp điểm đến, không phân biệt dấu', () => {
    expect(
      pickTripFlightDestination({ from: 'SGN', destinations, destinationName: 'nha trang', outbound: null }),
    ).toBe('CXR');
    expect(
      pickTripFlightDestination({ from: 'SGN', destinations, destinationName: 'Da Lat', outbound: null }),
    ).toBe('DLI');
    expect(
      pickTripFlightDestination({ from: 'SGN', destinations, destinationName: 'Huế', outbound: null }),
    ).toBe('');
  });
  it('chiều về bay về lại sân bay nhà của chiều đi', () => {
    expect(
      pickTripFlightDestination({
        from: 'CXR',
        destinations: [{ code: 'SGN', name: 'Hồ Chí Minh' }],
        destinationName: 'Nha Trang',
        outbound: { from: 'SGN', to: 'CXR' },
      }),
    ).toBe('SGN');
  });
  it('tìm chặng bay chiều đi đã chọn đủ sân bay', () => {
    const draft = {
      ...createTripPlanDraft(),
      days: [
        { points: [createTripPlanPoint({ mode: 'flight', fromCode: 'SGN' })] },
        { points: [createTripPlanPoint({ mode: 'flight', fromCode: 'SGN', toCode: 'CXR' })] },
      ],
    };
    expect(findTripOutboundFlight(draft)).toEqual({ from: 'SGN', to: 'CXR' });
    expect(findTripOutboundFlight(createTripPlanDraft())).toBeNull();
  });
});

describe('findPlaceAirport (TF105 tự lên lộ trình)', () => {
  const routes = [
    {
      destinations: [
        { code: 'HAN', name: 'Hà Nội' },
        { code: 'CXR', name: 'Khánh Hòa / Nha Trang' },
      ],
    },
    { destinations: [{ code: 'SGN', name: 'TP. Hồ Chí Minh' }] },
  ];
  it('tìm sân bay theo tên nơi, không phân biệt dấu; không khớp thì null', () => {
    expect(findPlaceAirport(routes, 'Hà Nội')).toBe('HAN');
    expect(findPlaceAirport(routes, 'nha trang')).toBe('CXR');
    expect(findPlaceAirport(routes, 'Huế')).toBeNull();
    expect(findPlaceAirport(routes, '')).toBeNull();
  });
});

describe('findPlaceFlightRoute (ô tìm vé ở Khám phá)', () => {
  const routes = [
    { airport: 'DAD', destinations: [{ code: 'HAN', name: 'Hà Nội', flightCount: 2 }] },
    {
      airport: 'SGN',
      destinations: [
        { code: 'HAN', name: 'Hà Nội', flightCount: 4 },
        { code: 'PQC', name: 'Phú Quốc', flightCount: 3 },
      ],
    },
    { airport: 'HAN', destinations: [{ code: 'SGN', name: 'Sài Gòn', flightCount: 1 }] },
  ];
  it('chọn điểm đi có nhiều chuyến nhất tới nơi gõ', () => {
    expect(findPlaceFlightRoute(routes, 'hà nội')).toEqual({ from: 'SGN', to: 'HAN' });
    expect(findPlaceFlightRoute(routes, 'Phú Quốc')).toEqual({ from: 'SGN', to: 'PQC' });
    expect(findPlaceFlightRoute(routes, 'Huế')).toBeNull();
  });
});

describe('planNextTripFlight (TF105 tự lên lộ trình)', () => {
  const base = { hotels: [], placeAirport: 'HAN', defaultHome: 'SGN', defaultDate: '2026-12-01' };
  it('chưa có chuyến nào: chiều đi từ nhà tới sân bay nơi đến, ngày nhận phòng đầu', () => {
    expect(
      planNextTripFlight({ ...base, flights: [], hotels: [{ checkIn: '2026-12-05', nights: 2 }] }),
    ).toEqual({ leg: 'outbound', from: 'SGN', to: 'HAN', date: '2026-12-05' });
  });
  it('đã có chiều đi: chiều về từ nơi đến về nhà, bay ngày trả phòng cuối', () => {
    expect(
      planNextTripFlight({
        ...base,
        flights: [{ from: 'DAD', to: 'HAN', date: '2026-12-05' }],
        hotels: [
          { checkIn: '2026-12-07', nights: 1 },
          { checkIn: '2026-12-05', nights: 2 },
        ],
      }),
    ).toEqual({ leg: 'inbound', from: 'HAN', to: 'DAD', date: '2026-12-08' });
    expect(
      planNextTripFlight({ ...base, flights: [{ from: 'SGN', to: 'HAN', date: '2026-12-05' }] }).date,
    ).toBe('2026-12-07');
  });
  it('đủ hai chiều hoặc nơi đến chưa có sân bay thì thêm chiều đi, sân bay đến để trống khi chưa biết', () => {
    const both = [
      { from: 'SGN', to: 'HAN', date: '2026-12-05' },
      { from: 'HAN', to: 'SGN', date: '2026-12-08' },
    ];
    expect(planNextTripFlight({ ...base, flights: both }).leg).toBe('outbound');
    expect(planNextTripFlight({ ...base, placeAirport: null, flights: [] })).toEqual({
      leg: 'outbound',
      from: 'SGN',
      to: '',
      date: '2026-12-01',
    });
  });
});

describe('loại điểm gợi ý (TF105)', () => {
  it('gửi loại người đăng chọn cho điểm gợi ý, không gửi cho khách sạn', () => {
    const draft = createTripPlanDraft();
    draft.days[0]!.points = [
      createTripPlanPoint({ title: 'Cà phê Cộng', category: 'cafe' }),
      createTripPlanPoint({ title: 'Đi dạo' }),
      createTripPlanPoint({ kind: 'hotel', title: 'Ana Mandara', hotelId: 'h1', category: 'food' }),
    ];
    const items = buildTripAttachment(draft, labels)?.items;
    expect(items?.[0]).toMatchObject({ title: 'Cà phê Cộng', category: 'cafe' });
    expect(items?.[1]).not.toHaveProperty('category');
    expect(items?.[2]).not.toHaveProperty('category');
  });

  it.each([
    ['Cà phê ở Cộng', 'cafe'],
    ['Ăn ở Chợ đêm Phú Quốc', 'food'],
    ['Quán bún chả', 'food'],
    ['Ghé Cầu Hôn', 'fun'],
    ['Trả phòng', 'other'],
    ['Dăn dò', 'other'],
  ] as const)('đoán "%s" là %s', (title, category) => {
    expect(guessTripPlanCategory(title)).toBe(category);
  });

  it('ưu tiên loại đã lưu, bài cũ thì đoán theo tên', () => {
    expect(getTripPlanCategory({ title: 'Cà phê', category: 'fun' })).toBe('fun');
    expect(getTripPlanCategory({ title: 'Cà phê' })).toBe('cafe');
  });
});

describe('mở lại lộ trình đã lưu để sửa (TF105)', () => {
  const saved = {
    destinationName: 'Phú Quốc',
    destinationPlaceId: 'phu-quoc',
    daysCount: 3,
    estimatedCostPerPerson: 4_500_000,
    priceDisclaimer: 'Giá chỉ mang tính chất tham khảo',
    posterMediaId: 'img-1',
    hotelId: 'h1',
    hotelName: 'Vinpearl',
    hotelProductId: 'h1--DLX',
    hotelRatePlanCode: 'RO',
    items: [
      {
        day: 1,
        title: 'Máy bay SGN → PQC',
        time: '06:45',
        transport: { mode: 'flight' as const, fromAirport: 'SGN', toAirport: 'PQC' },
      },
      { day: 1, title: 'Vinpearl', time: '14:00', notes: 'Deluxe', hotel: { hotelId: 'h1', productId: 'h1--DLX', ratePlanCode: 'RO' } },
      { day: 1, title: 'Ăn ở Chợ đêm', time: '19:00', location: 'Dương Đông', category: 'food' as const },
      { day: 3, title: 'Bay về sớm', transport: { mode: 'flight' as const, fromAirport: 'PQC', toAirport: 'SGN' } },
      { day: 2, title: 'Xe khách ra bến', transport: { mode: 'bus' as const } },
    ],
  };

  it('lưu lại y như cũ, không mất giờ, khách sạn, chặng bay, loại gợi ý, chi phí', () => {
    const draft = buildTripDraftFromAttachment(saved, labels);
    const again = buildTripAttachment(draft, labels);
    expect(again).toMatchObject({
      destinationName: 'Phú Quốc',
      destinationPlaceId: 'phu-quoc',
      daysCount: 3,
      estimatedCostPerPerson: 4_500_000,
      priceDisclaimer: 'Giá chỉ mang tính chất tham khảo',
      posterMediaId: 'img-1',
      hotelId: 'h1',
      hotelProductId: 'h1--DLX',
    });
    expect(again?.items).toEqual([
      saved.items[0],
      saved.items[1],
      saved.items[2],
      saved.items[4],
      saved.items[3],
    ]);
  });

  it('chặng tự đặt tên thì giữ tên, tên tự sinh thì để trống cho người sửa', () => {
    const draft = buildTripDraftFromAttachment(saved, labels);
    expect(draft.days[0]!.points[0]).toMatchObject({ title: '', mode: 'flight', fromCode: 'SGN', toCode: 'PQC' });
    expect(draft.days[2]!.points[0]).toMatchObject({ title: 'Bay về sớm' });
    expect(draft.days[0]!.points[2]).toMatchObject({ category: 'food', location: 'Dương Đông' });
  });

  it('bài cũ chỉ ghi tên khách sạn chung cả chuyến thì giữ nguyên khi lưu lại', () => {
    const draft = buildTripDraftFromAttachment(
      { destinationName: 'Đà Lạt', hotelName: 'Homestay Mây', items: [{ day: 1, title: 'Cà phê Mê Linh' }] },
      labels,
    );
    expect(buildTripAttachment(draft, labels)).toMatchObject({ hotelName: 'Homestay Mây', daysCount: 1 });
  });

  it('không có lộ trình thì ra bản nháp trống', () => {
    expect(buildTripDraftFromAttachment(null, labels)).toMatchObject({ destinationName: '', days: [{ points: [{ title: '' }] }] });
  });
});

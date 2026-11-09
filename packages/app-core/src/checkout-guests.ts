// Kiểm tra thông tin người đặt và hành khách trước khi gửi, theo cùng luật với server
// (core-api commerce/booking/domain/order-rules.ts) để báo đúng ô nào sai thay vì một câu chung.

export type PassengerType = 'adult' | 'child' | 'infant';

/** Lý do một ô sai; giao diện đổi sang câu tiếng Việt. */
export type GuestFieldError =
  | 'required'
  | 'invalidPhone'
  | 'invalidEmail'
  | 'invalidDate'
  | 'futureDate'
  | 'adultAge'
  | 'childAge'
  | 'infantAge'
  | 'childRoomAge'
  | 'infantRoomAge';

export interface CheckoutGuestsInput {
  contact: { fullName: string; phone: string; email: string };
  guests: { fullName: string; birthdate: string }[];
  /** Loại khách theo thứ tự hành khách (người lớn, trẻ em, em bé). */
  passengerTypes: (PassengerType | null | undefined)[];
  /** Ngày bay đầu và cuối của đơn; không có vé bay thì bỏ trống. */
  travelDates?: { first: string; last: string };
  /** Ngày nhận phòng sớm nhất; dùng khi đơn không có vé bay. */
  stayDate?: string;
  /** Hôm nay, YYYY-MM-DD. */
  today: string;
}

/** Ngày bay đầu và cuối từ các mục của đơn. */
export function findTravelDates(items: readonly { productType: string; date: string }[]) {
  const dates = items
    .filter((item) => item.productType === 'flight')
    .map((item) => item.date)
    .sort();
  return dates.length ? { first: dates[0]!, last: dates.at(-1)! } : undefined;
}

/** Ngày nhận phòng sớm nhất từ các mục của đơn. */
export function findStayDate(items: readonly { productType: string; date: string }[]) {
  return items
    .filter((item) => item.productType === 'room')
    .map((item) => item.date)
    .sort()[0];
}

/** Tuổi tròn năm của người sinh ngày birthdate tính tới ngày date (YYYY-MM-DD). */
export function countAgeOn(birthdate: string, date: string): number {
  const age = Number(date.slice(0, 4)) - Number(birthdate.slice(0, 4));
  return date.slice(5) < birthdate.slice(5) ? age - 1 : age;
}

const isRealDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && value >= '1900-01-01';
};

function findAgeError(type: PassengerType, ageAtFirst: number, ageAtLast: number): GuestFieldError | null {
  if (type === 'adult') return ageAtFirst >= 12 ? null : 'adultAge';
  if (type === 'child') return ageAtFirst <= 11 && ageAtLast >= 2 ? null : 'childAge';
  return ageAtFirst >= 0 && ageAtLast < 2 ? null : 'infantAge';
}

function findRoomAgeError(type: PassengerType, age: number): GuestFieldError | null {
  if (type === 'child') return age >= 4 && age <= 11 ? null : 'childRoomAge';
  if (type === 'infant') return age >= 0 && age < 4 ? null : 'infantRoomAge';
  return null;
}

/**
 * Các ô sai, khoá giống tên trường server trả về: contact.fullName, contact.phone, contact.email,
 * guests[i].fullName, guests[i].birthdate. Rỗng là hợp lệ.
 */
export function findCheckoutFieldErrors(input: CheckoutGuestsInput): Record<string, GuestFieldError> {
  const errors: Record<string, GuestFieldError> = {};
  if (!input.contact.fullName.trim()) errors['contact.fullName'] = 'required';
  const phone = input.contact.phone.replace(/\s/g, '');
  if (!phone) errors['contact.phone'] = 'required';
  else if (!/^0\d{9,10}$/.test(phone)) errors['contact.phone'] = 'invalidPhone';
  const email = input.contact.email.trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors['contact.email'] = 'invalidEmail';

  input.guests.forEach((guest, index) => {
    if (!guest.fullName.trim()) errors[`guests[${index}].fullName`] = 'required';
    const key = `guests[${index}].birthdate`;
    const birthdate = guest.birthdate;
    if (!birthdate) errors[key] = 'required';
    else if (!isRealDate(birthdate)) errors[key] = 'invalidDate';
    else if (birthdate > input.today) errors[key] = 'futureDate';
    else {
      const type = input.passengerTypes[index];
      const dates = input.travelDates;
      const ageError =
        type && dates
          ? findAgeError(type, countAgeOn(birthdate, dates.first), countAgeOn(birthdate, dates.last))
          : type && input.stayDate
            ? findRoomAgeError(type, countAgeOn(birthdate, input.stayDate))
            : null;
      if (ageError) errors[key] = ageError;
    }
  });
  return errors;
}

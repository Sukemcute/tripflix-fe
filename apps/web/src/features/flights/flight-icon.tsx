const paths = {
  takeoff: (
    <path d="M2 20h20M5.5 15.5 3 11l2.2-.6 2.6 2.3 4-1.1-3.4-6.2 2.6-.7 6 5.4 3.5-1a1.8 1.8 0 0 1 1 3.4L7.7 16.6a2 2 0 0 1-2.2-1.1Z" />
  ),
  landing: (
    <path d="M2 20h20M4 6.5l1.8-1.6 3 1.6 3.9 1.5-.5-6.8 2.5.8 3 7.2 3.3 1.3a1.8 1.8 0 0 1-1.2 3.4L5.6 10.4a2 2 0 0 1-1.2-1.6Z" />
  ),
  // Máy bay hướng sang phải, dùng cho đường bay và nhãn "Một chiều".
  plane: (
    <path d="M2.5 13.2 6 12l-2-5.2 1.6-.5 4.6 4.7 6.3-1.6c1.3-.3 2.7.2 3.3 1.2.4.7 0 1.5-.8 1.7L5.4 15.6a1.6 1.6 0 0 1-1.7-.6ZM9 15l2.5 5.2 1.7-.5.6-6" />
  ),
  swap: <path d="M7 4 3 8l4 4M3 8h14m0 4 4 4-4 4m4-4H7" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4m10-4v4M3 11h18" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2m2-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 2 4v3" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
  chevron: <path d="m6 9 6 6 6-6" />,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 5 5 9-10" />,
  seat: <path d="M7 3v9a3 3 0 0 0 3 3h7m-10 0-1 6m11-6 1 6M5 10h2m4 5V9" />,
  shield: <path d="M12 3 4 6v6c0 4.4 3.4 8.2 8 9 4.6-.8 8-4.6 8-9V6Zm-3.5 9 2.5 2.5 4.5-5" />,
};

export type FlightIconName = keyof typeof paths;

export function FlightIcon({ name, size = 20 }: { name: FlightIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

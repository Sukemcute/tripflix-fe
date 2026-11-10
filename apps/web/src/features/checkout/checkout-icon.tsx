const paths = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a6 6 0 0 1 12 0v2m2-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 2 4v3" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" />
      <path d="M16 13.5h.01" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  shield: <path d="M12 3 4 6v6c0 4.4 3.4 8.2 8 9 4.6-.8 8-4.6 8-9V6Zm-3.5 9 2.5 2.5 4.5-5" />,
  check: <path d="m5 12 5 5 9-10" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M19 12H5m6-6-6 6 6 6" />,
  plane: (
    <path d="M2.5 13.2 6 12l-2-5.2 1.6-.5 4.6 4.7 6.3-1.6c1.3-.3 2.7.2 3.3 1.2.4.7 0 1.5-.8 1.7L5.4 15.6a1.6 1.6 0 0 1-1.7-.6ZM9 15l2.5 5.2 1.7-.5.6-6" />
  ),
  bed: <path d="M3 18V7m18 11v-6a3 3 0 0 0-3-3h-7v6M3 15h18M7 12a1.5 1.5 0 1 0 0-.01" />,
  refresh: <path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v3h3m-3 6a8 8 0 0 0 14.6 4.5M20 20v-3h-3" />,
};

export type CheckoutIconName = keyof typeof paths;

export function CheckoutIcon({ name, size = 20 }: { name: CheckoutIconName; size?: number }) {
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

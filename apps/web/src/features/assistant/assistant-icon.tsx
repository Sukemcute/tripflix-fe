// Biểu tượng nét (24x24) cho khung Tripi, vẽ bằng path như các icon khác của web.
const PATHS = {
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  cloud: 'M7 18h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 10.5 3.8 3.8 0 0 0 7 18z',
  rain: 'M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7.5 3.8 3.8 0 0 0 7 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3',
  storm: 'M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 7.5 3.8 3.8 0 0 0 7 15zM13 15l-2 4h3l-2 4',
  wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l13-3v3M16 13.5h2',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  sparkles: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  login: 'M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5',
  minimize: 'M5 12h14',
  compose: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  play: 'M8 5v14l11-7z',
  bed: 'M3 18V6M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6M7 11.5a1.5 1.5 0 1 0 0-.01',
  plane: 'M10.5 21l1.5-1 1.5 1v-3.5L21 13v-2l-7.5 2.5V6a1.5 1.5 0 0 0-3 0v7.5L3 11v2l7.5 4.5z',
  news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M8 9h5M8 13h5',
  chevron: 'M9 6l6 6-6 6',
  check: 'M5 12l5 5 9-10',
  car: 'M5 16V11l2-5h10l2 5v5M3 16h18M7 16v2M17 16v2M7.5 12.5h.01M16.5 12.5h.01',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
  compare: 'M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l-3 3M17 7l3 3',
  chat: 'M4 5h16v11H9l-5 4z',
  bus: 'M5 4h14v12H5zM5 11h14M8 16v3M16 16v3M8 13.5h.01M16 13.5h.01',
  checklist: 'M4 5h16v14H4zM8 12l3 3 5-6',
} as const;

export type AssistantIconName = keyof typeof PATHS;

export function AssistantIcon({ name, size = 20 }: { name: AssistantIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

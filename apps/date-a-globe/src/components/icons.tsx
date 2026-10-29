// Line icons drawn for the v3 screens, in ink unless told otherwise.
const INK = "#161513";

export const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M4 4l8 8M12 4l-8 8" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const UndoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path
      d="M6.5 4.5L3 8l3.5 3.5"
      stroke={INK}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M3.5 8h7a4 4 0 010 8H9" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M10 3L5 8l5 5"
      stroke={INK}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M2.5 10s2.8-5 7.5-5 7.5 5 7.5 5-2.8 5-7.5 5-7.5-5-7.5-5z"
      stroke={INK}
      strokeWidth="1.6"
    />
    <circle cx="10" cy="10" r="2.2" stroke={INK} strokeWidth="1.6" />
    <path d="M3.5 16.5l13-13" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const CheckIcon = ({ color = INK, size = 14 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M3 7.5l2.6 2.6L11 4.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CrossIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M4 4l6 6M10 4l-6 6" stroke={INK} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ArrowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M4 10h11m-4.5-5L15 10l-4.5 5"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ShareIcon = () => (
  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path
      d="M9 11V2.5M5.5 6L9 2.5 12.5 6"
      stroke={INK}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.5 9.5v5h11v-5"
      stroke={INK}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GlobeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="10" r="7" stroke={INK} strokeWidth="1.6" />
    <path d="M4 10h14M11 3c2.6 2.8 2.6 11.2 0 14" stroke={INK} strokeWidth="1.2" />
    <path d="M17.5 4.5A8.8 8.8 0 015.5 18" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
    <path d="M11 19.5v2.5M7.5 22h7" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

export const WorldMapIcon = () => (
  <svg width="24" height="22" viewBox="0 0 26 22" fill="none" aria-hidden="true">
    <rect x="2" y="3" width="22" height="16" rx="2" stroke={INK} strokeWidth="1.6" />
    <path
      d="M6 8c2-1 3 1 5 0s2 2 4 1M14 13c2 0 3-1 5 0M7 14c1 1 2 1 3 0"
      stroke={INK}
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

export const PartMapIcon = () => (
  <svg width="24" height="22" viewBox="0 0 26 22" fill="none" aria-hidden="true">
    <rect x="2" y="3" width="22" height="16" rx="2" stroke={INK} strokeWidth="1.6" />
    <rect
      x="8"
      y="6.5"
      width="10"
      height="9"
      rx="1.5"
      fill="#F2BDB5"
      stroke="#D7382F"
      strokeWidth="1.4"
      strokeDasharray="2.5 1.8"
    />
  </svg>
);

export const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#fff"
      d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0012 .3"
    />
  </svg>
);

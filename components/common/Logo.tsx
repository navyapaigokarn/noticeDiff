export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#3730a3" />
      <path d="M8 11.5h16M8 16.5h11M8 21.5h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="23.5" cy="21.5" r="3" fill="#34d399" />
    </svg>
  );
}

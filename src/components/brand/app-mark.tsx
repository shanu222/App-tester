export function AppMark({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-control border border-line bg-white object-contain"
        style={{ width: size, height: size }}
      />
    );
  }

  const icon = Math.max(16, Math.round(size * 0.42));
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-control border border-line bg-brand-soft text-brand"
      style={{ width: size, height: size }}
      aria-hidden
      title={name}
    >
      <svg width={icon} height={icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="7" y="3" width="10" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
        <path d="M10 6h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="12" cy="17.5" r="0.9" fill="currentColor" />
      </svg>
    </div>
  );
}

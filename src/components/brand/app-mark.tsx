import { cn } from "@/lib/utils";

export function AppMark({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-lg bg-slate-950 object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-medium text-slate-300",
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials || "App"}
    </div>
  );
}

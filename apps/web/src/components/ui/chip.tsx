import { cn } from "@/lib/cn";

export function Chip({
  active = false,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-brand-700 bg-brand-700 text-white"
          : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50",
      )}
    >
      {children}
    </button>
  );
}

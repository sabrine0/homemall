import { cn } from "@/lib/cn";

export function StatCard({
  title,
  value,
  subtitle,
  className,
}: {
  title: string;
  value: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-brand-200 bg-white/75 p-4 shadow-panel",
        className,
      )}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-brand-600">
        {title}
      </p>
      <p className="mt-2 text-3xl font-semibold text-brand-900">{value}</p>
      {subtitle ? (
        <p className="mt-1 text-sm text-brand-700/80">{subtitle}</p>
      ) : null}
    </div>
  );
}

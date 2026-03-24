import { cn } from "@/lib/cn";

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-semibold transition",
            item === value
              ? "border-brand-700 bg-brand-700 text-white"
              : "border-brand-200 bg-white text-brand-800 hover:bg-brand-50",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

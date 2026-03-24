export function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
      {children}
    </span>
  );
}

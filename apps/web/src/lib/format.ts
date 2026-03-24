export const formatCurrency = (value: number): string => {
  const rounded = Math.round(value);
  const absolute = Math.abs(rounded);
  const formatted = new Intl.NumberFormat("fr-MA", {
    maximumFractionDigits: 0,
  }).format(absolute);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}${formatted} DH`;
};

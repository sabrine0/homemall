export const clamp = (value: number, min = 0, max = 1): number => {
  return Math.min(max, Math.max(min, value));
};

export const normalizeIndex = (value: number, maxValue = 100): number => {
  return clamp(value / maxValue, 0, 1);
};

export const average = (values: number[]): number => {
  if (!values.length) {
    return 0;
  }
  const sum = values.reduce((acc, item) => acc + item, 0);
  return sum / values.length;
};

export const round2 = (value: number): number => {
  return Math.round(value * 100) / 100;
};

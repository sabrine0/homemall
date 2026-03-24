export const clamp = (value, min = 0, max = 1) => {
    return Math.min(max, Math.max(min, value));
};
export const normalizeIndex = (value, maxValue = 100) => {
    return clamp(value / maxValue, 0, 1);
};
export const average = (values) => {
    if (!values.length) {
        return 0;
    }
    const sum = values.reduce((acc, item) => acc + item, 0);
    return sum / values.length;
};
export const round2 = (value) => {
    return Math.round(value * 100) / 100;
};

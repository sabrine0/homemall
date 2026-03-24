import type { ResolvedLocale } from "@/lib/i18n/messages";

const cityLabelsArabic: Record<string, string> = {
  agadir: "أكادير",
  ahfir: "أحفير",
  "al hoceima": "الحسيمة",
  asilah: "أصيلة",
  azrou: "أزرو",
  "beni mellal": "بني ملال",
  berkane: "بركان",
  berrechid: "برشيد",
  bouznika: "بوزنيقة",
  casablanca: "الدار البيضاء",
  chefchaouen: "شفشاون",
  dakhla: "الداخلة",
  "el jadida": "الجديدة",
  errachidia: "الرشيدية",
  essaouira: "الصويرة",
  fes: "فاس",
  fez: "فاس",
  fnideq: "الفنيدق",
  guelmim: "كلميم",
  ifrane: "إفران",
  kenitra: "القنيطرة",
  khemisset: "الخميسات",
  khouribga: "خريبكة",
  laayoune: "العيون",
  larache: "العرائش",
  marrakech: "مراكش",
  meknes: "مكناس",
  mohammedia: "المحمدية",
  nador: "الناظور",
  ouarzazate: "ورزازات",
  oujda: "وجدة",
  rabat: "الرباط",
  safi: "آسفي",
  sale: "سلا",
  settat: "سطات",
  "sidi ifni": "سيدي إفني",
  "sidi kacem": "سيدي قاسم",
  tangier: "طنجة",
  tanger: "طنجة",
  taza: "تازة",
  tetouan: "تطوان",
  tinghir: "تنغير",
  tiznit: "تيزنيت",
  youssoufia: "اليوسفية",
};

const normalizedKey = (value: string) => value.trim().toLowerCase();

const localizeBaseLabel = (value: string, locale: ResolvedLocale) => {
  if (locale !== "ar") {
    return value;
  }

  return cityLabelsArabic[normalizedKey(value)] ?? value;
};

export const getLocalizedCityName = (
  city: string,
  locale: ResolvedLocale,
) => {
  return localizeBaseLabel(city, locale);
};

export const getLocalizedZoneName = (
  zoneName: string,
  city: string,
  locale: ResolvedLocale,
) => {
  if (locale !== "ar") {
    return zoneName;
  }

  const patterns: Array<[RegExp, (base: string) => string]> = [
    [/^(.*)\s+City Center$/i, (base) => `وسط مدينة ${localizeBaseLabel(base, locale)}`],
    [/^(.*)\s+New Town$/i, (base) => `${localizeBaseLabel(base, locale)} الجديدة`],
    [/^(.*)\s+Heights$/i, (base) => `مرتفعات ${localizeBaseLabel(base, locale)}`],
    [/^(.*)\s+Gardens$/i, (base) => `حدائق ${localizeBaseLabel(base, locale)}`],
    [/^(.*)\s+Marina$/i, (base) => `مارينا ${localizeBaseLabel(base, locale)}`],
    [/^(.*)\s+Plateau$/i, (base) => `هضبة ${localizeBaseLabel(base, locale)}`],
    [/^(.*)\s+Hills$/i, (base) => `تلال ${localizeBaseLabel(base, locale)}`],
    [/^(.*)\s+Village$/i, (base) => `قرية ${localizeBaseLabel(base, locale)}`],
  ];

  for (const [pattern, transform] of patterns) {
    const match = zoneName.match(pattern);
    if (match?.[1]) {
      return transform(match[1].trim());
    }
  }

  const localizedCity = localizeBaseLabel(city, locale);
  if (localizedCity !== city && zoneName.startsWith(city)) {
    return `${localizedCity}${zoneName.slice(city.length)}`;
  }

  return zoneName;
};

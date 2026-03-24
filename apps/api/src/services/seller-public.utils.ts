const titleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");

const commonMailDomains = new Set([
  "gmail",
  "hotmail",
  "outlook",
  "yahoo",
  "icloud",
  "live",
  "protonmail",
]);

export const deriveSellerDisplayName = (email: string): string => {
  const localPart = email.split("@")[0] ?? "";
  const cleaned = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "HomeMall Seller";
  }

  return titleCase(cleaned);
};

export const deriveSellerCompanyName = (
  email: string,
  fallbackArea?: string,
): string => {
  const domain = email.split("@")[1] ?? "";
  const companyRoot = domain.split(".")[0]?.trim().toLowerCase() ?? "";

  if (companyRoot && !commonMailDomains.has(companyRoot)) {
    return `${titleCase(companyRoot)} Realty`;
  }

  if (fallbackArea?.trim()) {
    return `${fallbackArea.trim()} Property Desk`;
  }

  return "Independent Seller";
};

export const deriveSellerInitials = (displayName: string): string => {
  const parts = displayName
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return "HM";
  }

  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return initials.join("");
};

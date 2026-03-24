import type { PropertyListing as PropertyListingData } from "@homemall/shared";

export class PropertyListing {
  readonly id: string;
  readonly zoneId: string;
  readonly title: string;
  readonly type: PropertyListingData["type"];
  readonly purpose: PropertyListingData["purpose"];
  readonly priceMonthly?: number;
  readonly priceSale?: number;
  readonly areaM2?: number;
  readonly bedrooms?: number;
  readonly bathrooms?: number;
  readonly imageUrl?: string;

  constructor(input: PropertyListingData) {
    if (!input.id || !input.zoneId || !input.title) {
      throw new Error("PropertyListing requires id, zoneId, and title.");
    }

    this.id = input.id;
    this.zoneId = input.zoneId;
    this.title = input.title;
    this.type = input.type;
    this.purpose = input.purpose;
    this.priceMonthly = input.priceMonthly;
    this.priceSale = input.priceSale;
    this.areaM2 = input.areaM2;
    this.bedrooms = input.bedrooms;
    this.bathrooms = input.bathrooms;
    this.imageUrl = input.imageUrl;
  }

  toJSON(): PropertyListingData {
    return {
      id: this.id,
      zoneId: this.zoneId,
      title: this.title,
      type: this.type,
      purpose: this.purpose,
      priceMonthly: this.priceMonthly,
      priceSale: this.priceSale,
      areaM2: this.areaM2,
      bedrooms: this.bedrooms,
      bathrooms: this.bathrooms,
      imageUrl: this.imageUrl
    };
  }
}

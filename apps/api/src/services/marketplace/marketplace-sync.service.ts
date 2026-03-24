import { ExternalListingIngestionService } from "../external-listing-ingestion.service.js";
import { fetchAvitoRows } from "./avito-provider.js";
import { fetchMubawabRows } from "./mubawab-provider.js";

export class MarketplaceSyncService {
  private readonly ingestion = new ExternalListingIngestionService();

  async refreshSource(
    source: "avito" | "mubawab",
    options?: { maxRows?: number; deactivateMissing?: boolean }
  ) {
    const maxRows = options?.maxRows ?? 120;
    const rows =
      source === "avito"
        ? await fetchAvitoRows(maxRows)
        : await fetchMubawabRows(maxRows);

    return this.ingestion.ingest({
      format: "json",
      source,
      content: JSON.stringify({ rows }),
      deactivateMissing: options?.deactivateMissing ?? true
    });
  }

  async refreshAll(options?: { maxRows?: number; deactivateMissing?: boolean }) {
    const [avito, mubawab] = await Promise.all([
      this.refreshSource("avito", options),
      this.refreshSource("mubawab", options)
    ]);

    return {
      refreshedAt: new Date().toISOString(),
      avito,
      mubawab
    };
  }
}

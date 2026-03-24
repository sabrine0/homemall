import { env } from "../config/env.js";
import { MarketplaceSyncService } from "../services/marketplace/marketplace-sync.service.js";

export const startMarketplaceSyncJob = () => {
  if (!env.EXTERNAL_INGESTION_ENABLED) {
    return () => undefined;
  }

  const service = new MarketplaceSyncService();
  let timer: NodeJS.Timeout | undefined;
  let running = false;

  const runSync = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      const result = await service.refreshAll({
        maxRows: env.EXTERNAL_INGESTION_MAX_ROWS,
        deactivateMissing: env.EXTERNAL_INGESTION_DEACTIVATE_MISSING
      });
      console.log(
        `[marketplace-sync] ${result.refreshedAt} avito: ${result.avito.createdListings}/${result.avito.updatedListings}, mubawab: ${result.mubawab.createdListings}/${result.mubawab.updatedListings}`
      );
    } catch (error) {
      console.error("[marketplace-sync] Failed to refresh listings", error);
    } finally {
      running = false;
    }
  };

  void runSync();
  const intervalMs = Math.max(15, env.EXTERNAL_INGESTION_INTERVAL_MINUTES) * 60 * 1000;
  timer = setInterval(() => {
    void runSync();
  }, intervalMs);

  console.log(
    `[marketplace-sync] enabled (interval ${Math.round(intervalMs / 60000)} min, maxRows ${env.EXTERNAL_INGESTION_MAX_ROWS})`
  );

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
};

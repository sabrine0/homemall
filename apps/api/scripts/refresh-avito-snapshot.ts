import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ExternalListingIngestionService } from "../src/services/external-listing-ingestion.service.js";
import { fetchAvitoRows } from "../src/services/marketplace/avito-provider.js";
import { fetchMubawabRows } from "../src/services/marketplace/mubawab-provider.js";

const writeSnapshot = (fileName: string, source: string, rows: Record<string, unknown>[]) => {
  const payload = {
    source,
    fetchedAt: new Date().toISOString(),
    rows
  };
  const outPath = resolve(process.cwd(), `../../docs/${fileName}`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  return outPath;
};

const main = async () => {
  const ingestionService = new ExternalListingIngestionService();

  const [avitoRows, mubawabRows] = await Promise.all([
    fetchAvitoRows(150),
    fetchMubawabRows(120)
  ]);

  const avitoSnapshotPath = writeSnapshot("avito-import-live.json", "avito.ma", avitoRows);
  const mubawabSnapshotPath = writeSnapshot("mubawab-import-live.json", "mubawab.ma", mubawabRows);

  const [avitoResult, mubawabResult] = await Promise.all([
    ingestionService.ingest({
      format: "json",
      source: "avito",
      content: JSON.stringify({ rows: avitoRows }),
      deactivateMissing: true
    }),
    ingestionService.ingest({
      format: "json",
      source: "mubawab",
      content: JSON.stringify({ rows: mubawabRows }),
      deactivateMissing: true
    })
  ]);

  console.log(`Saved snapshot file: ${avitoSnapshotPath}`);
  console.log(`Saved snapshot file: ${mubawabSnapshotPath}`);
  console.log(
    `Avito import -> parsed: ${avitoResult.parsed}, listings created: ${avitoResult.createdListings}, listings updated: ${avitoResult.updatedListings}, zones created: ${avitoResult.createdZones}, zones updated: ${avitoResult.updatedZones}, errors: ${avitoResult.errors.length}`
  );
  console.log(
    `Mubawab import -> parsed: ${mubawabResult.parsed}, listings created: ${mubawabResult.createdListings}, listings updated: ${mubawabResult.updatedListings}, zones created: ${mubawabResult.createdZones}, zones updated: ${mubawabResult.updatedZones}, errors: ${mubawabResult.errors.length}`
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

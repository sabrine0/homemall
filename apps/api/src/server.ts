import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { startMarketplaceSyncJob } from "./jobs/marketplace-sync.job.js";

const server = app.listen(env.PORT, () => {
  console.log(`HomeMall API listening on port ${env.PORT}`);
});
const stopMarketplaceSyncJob = startMarketplaceSyncJob();

const shutdown = async () => {
  console.log("Shutting down API server...");
  server.close(async () => {
    stopMarketplaceSyncJob();
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

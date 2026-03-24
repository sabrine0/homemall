import { config } from "dotenv";
import { z } from "zod";

config();

const envBool = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  COOKIE_NAME: z.string().default("homemall_token"),
  EXTERNAL_INGESTION_ENABLED: envBool.default(false),
  EXTERNAL_INGESTION_INTERVAL_MINUTES: z.coerce.number().int().min(5).default(360),
  EXTERNAL_INGESTION_MAX_ROWS: z.coerce.number().int().min(20).max(1000).default(120),
  EXTERNAL_INGESTION_DEACTIVATE_MISSING: envBool.default(true)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

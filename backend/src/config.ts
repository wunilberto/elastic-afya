import dotenv from "dotenv";
dotenv.config();

interface ElasticConfig {
  node?: string;
  cloudId?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  tlsRejectUnauthorized: boolean;
}

const elasticConfig: ElasticConfig = {
  node: process.env.ELASTIC_NODE || undefined,
  cloudId: process.env.ELASTIC_CLOUD_ID || undefined,
  apiKey: process.env.ELASTIC_API_KEY || undefined,
  username: process.env.ELASTIC_USERNAME || undefined,
  password: process.env.ELASTIC_PASSWORD || undefined,
  tlsRejectUnauthorized: String(process.env.ELASTIC_TLS_REJECT_UNAUTHORIZED || "true").toLowerCase() !== "false",
};

export const config = {
  env: process.env.NODE_ENV || "development",
  elastic: elasticConfig,
  metrics: {
    jobEnabled: String(process.env.METRICS_JOB_ENABLED || "false").toLowerCase() === "true",
    jobIntervalMs: Number(process.env.METRICS_JOB_INTERVAL_MS || 60_000),
    windowMinutes: Number(process.env.METRICS_WINDOW_MINUTES || 10),
    // fallback legacy
    windowDays: Number(process.env.METRICS_WINDOW_DAYS || 7),
  },
};



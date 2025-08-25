import "./apm";
import express, { Request, Response } from "express";
import cors from "cors";
import { config } from "./config";
import { logger } from "./logger";
import { searchRouter } from "./routes/search";
import { analyticsRouter } from "./routes/analytics";
import { metricsRouter } from "./routes/metrics";
import { startMetricsJob } from "./jobs/metricsJob";
import { autocompleteRouter } from "./routes/autocomplete";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (req: Request, res: Response) => {
  res.json({ ok: true, env: config.env });
});

app.use("/api/search", searchRouter);
app.use("/search", searchRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/metrics", metricsRouter);
app.use("/api/autocomplete", autocompleteRouter);
startMetricsJob();

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  logger.info(
    {
      port,
      elasticNode: config.elastic.node,
      hasCloudId: Boolean(config.elastic.cloudId),
      hasApiKey: Boolean(config.elastic.apiKey),
    },
    "API listening"
  );
});



"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./apm");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const logger_1 = require("./logger");
const search_1 = require("./routes/search");
const analytics_1 = require("./routes/analytics");
const metrics_1 = require("./routes/metrics");
const metricsJob_1 = require("./jobs/metricsJob");
const autocomplete_1 = require("./routes/autocomplete");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json({ limit: "1mb" }));
app.get("/health", (req, res) => {
    res.json({ ok: true, env: config_1.config.env });
});
app.use("/api/search", search_1.searchRouter);
app.use("/search", search_1.searchRouter);
app.use("/api/analytics", analytics_1.analyticsRouter);
app.use("/api/metrics", metrics_1.metricsRouter);
app.use("/api/autocomplete", autocomplete_1.autocompleteRouter);
(0, metricsJob_1.startMetricsJob)();
const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
    logger_1.logger.info({
        port,
        elasticNode: config_1.config.elastic.node,
        hasCloudId: Boolean(config_1.config.elastic.cloudId),
        hasApiKey: Boolean(config_1.config.elastic.apiKey),
    }, "API listening");
});

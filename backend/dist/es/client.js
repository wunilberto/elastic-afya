"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.esClient = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const config_1 = require("../config");
const logger_1 = require("../logger");
function buildClient() {
    const hasCloud = Boolean(config_1.config.elastic.cloudId);
    const hasNode = Boolean(config_1.config.elastic.node);
    if (!hasCloud && !hasNode) {
        throw new Error("Elasticsearch connection not configured. Set ELASTIC_NODE or ELASTIC_CLOUD_ID.");
    }
    const auth = config_1.config.elastic.apiKey
        ? { apiKey: config_1.config.elastic.apiKey }
        : config_1.config.elastic.username || config_1.config.elastic.password
            ? { username: config_1.config.elastic.username, password: config_1.config.elastic.password }
            : undefined;
    const client = new elasticsearch_1.Client({
        ...(hasCloud ? { cloud: { id: config_1.config.elastic.cloudId } } : {}),
        ...(hasNode ? { node: config_1.config.elastic.node } : {}),
        ...(auth ? { auth } : {}),
        headers: {
            accept: "application/vnd.elasticsearch+json; compatible-with=8",
            "content-type": "application/vnd.elasticsearch+json; compatible-with=8",
        },
        tls: {
            rejectUnauthorized: config_1.config.elastic.tlsRejectUnauthorized,
        },
    });
    client.info().then(() => {
        logger_1.logger.info("Connected to Elasticsearch");
    }).catch((err) => {
        logger_1.logger.error({ err }, "Failed to connect to Elasticsearch");
    });
    return client;
}
exports.esClient = buildClient();

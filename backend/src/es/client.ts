import { Client } from "@elastic/elasticsearch";
import { config } from "../config";
import { logger } from "../logger";

function buildClient(): Client {
  const hasCloud = Boolean(config.elastic.cloudId);
  const hasNode = Boolean(config.elastic.node);

  if (!hasCloud && !hasNode) {
    throw new Error("Elasticsearch connection not configured. Set ELASTIC_NODE or ELASTIC_CLOUD_ID.");
  }

  const auth = config.elastic.apiKey
    ? { apiKey: config.elastic.apiKey }
    : config.elastic.username || config.elastic.password
    ? { username: config.elastic.username!, password: config.elastic.password! }
    : undefined;

  const client = new Client({
    ...(hasCloud ? { cloud: { id: config.elastic.cloudId! } } : {}),
    ...(hasNode ? { node: config.elastic.node! } : {}),
    ...(auth ? { auth } : {}),
    headers: {
      accept: "application/vnd.elasticsearch+json; compatible-with=8",
      "content-type": "application/vnd.elasticsearch+json; compatible-with=8",
    },
    tls: {
      rejectUnauthorized: config.elastic.tlsRejectUnauthorized,
    },
  });

  client.info().then(() => {
    logger.info("Connected to Elasticsearch");
  }).catch((err) => {
    logger.error({ err }, "Failed to connect to Elasticsearch");
  });

  return client;
}

export const esClient = buildClient();



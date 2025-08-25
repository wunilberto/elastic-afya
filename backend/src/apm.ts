import apm from "elastic-apm-node";

const active = process.env.APM_ACTIVE === "true";

if (active) {
  apm.start({
    serviceName: process.env.APM_SERVICE_NAME || "search-service",
    secretToken: process.env.APM_SECRET_TOKEN,
    serverUrl: process.env.APM_SERVER_URL,
    environment: process.env.NODE_ENV || "development",
  });
}

export default apm;



"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const elastic_apm_node_1 = __importDefault(require("elastic-apm-node"));
const active = process.env.APM_ACTIVE === "true";
if (active) {
    elastic_apm_node_1.default.start({
        serviceName: process.env.APM_SERVICE_NAME || "search-service",
        secretToken: process.env.APM_SECRET_TOKEN,
        serverUrl: process.env.APM_SERVER_URL,
        environment: process.env.NODE_ENV || "development",
    });
}
exports.default = elastic_apm_node_1.default;

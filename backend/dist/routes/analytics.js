"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("../es/client");
exports.analyticsRouter = (0, express_1.Router)();
const TrackClickSchema = zod_1.z.object({
    query_id: zod_1.z.string(),
    doc_id: zod_1.z.string(),
    rank: zod_1.z.number().int().min(1),
    timestamp: zod_1.z.number().optional(),
});
exports.analyticsRouter.post("/click", async (req, res) => {
    const parsed = TrackClickSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { query_id, doc_id, rank, timestamp } = parsed.data;
    await client_1.esClient.index({
        index: "analiticos-cliques",
        document: { id_consulta: query_id, id_documento: doc_id, posicao: rank, carimbo_tempo: timestamp ?? Date.now() },
        refresh: "false",
    });
    res.status(204).send();
});

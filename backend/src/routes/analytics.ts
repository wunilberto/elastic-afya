import { Router } from "express";
import { z } from "zod";
import { esClient } from "../es/client";

export const analyticsRouter = Router();

const TrackClickSchema = z.object({
  query_id: z.string(),
  doc_id: z.string(),
  rank: z.number().int().min(1),
  timestamp: z.number().optional(),
});

analyticsRouter.post("/click", async (req, res) => {
  const parsed = TrackClickSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { query_id, doc_id, rank, timestamp } = parsed.data;
  await esClient.index({
    index: "analiticos-cliques",
    document: { id_consulta: query_id, id_documento: doc_id, posicao: rank, carimbo_tempo: timestamp ?? Date.now() },
    refresh: "false",
  });
  res.status(204).send();
});



import { Router } from "express";
import { esClient } from "../es/client";

export const metricsRouter = Router();

// REST endpoint to return CLI-equivalent metrics (total, zero-rate, ctr, ctr@1)
metricsRouter.get("/cli", async (req, res) => {
  const today = Date.now();
  const start = today - 7 * 24 * 60 * 60 * 1000;

  const [searchAgg, clickAgg] = await Promise.all([
    esClient.search({
      index: "analiticos-buscas",
      size: 0,
      query: { range: { carimbo_tempo: { gte: start, lte: today } } },
      aggs: {
        total_searches: { value_count: { field: "id_consulta" } },
        zero_results: { filter: { term: { total: 0 } } },
      },
    }),
    esClient.search({
      index: "analiticos-cliques",
      size: 0,
      query: { range: { carimbo_tempo: { gte: start, lte: today } } },
      aggs: {
        total_clicks: { value_count: { field: "id_documento" } },
        clicks_rank_1: { filter: { term: { posicao: 1 } } },
      },
    }),
  ]);

  const searches = (searchAgg.aggregations as any)?.total_searches?.value ?? 0;
  const zero = (searchAgg.aggregations as any)?.zero_results?.doc_count ?? 0;
  const clicks = (clickAgg.aggregations as any)?.total_clicks?.value ?? 0;
  const ctr = searches > 0 ? clicks / searches : 0;
  const ctrAt1 = searches > 0 ? ((clickAgg.aggregations as any)?.clicks_rank_1?.doc_count ?? 0) / searches : 0;
  const zeroRate = searches > 0 ? zero / searches : 0;

  res.json({ totalBuscas: searches, zeroResultsPct: zeroRate, ctrGeral: ctr, ctrAt1 });
});

metricsRouter.get("/kpis", async (req, res) => {
  const minutes = Number((req.query.minutes as string) || 10);
  const now = Date.now();
  const startMs = now - minutes * 60 * 1000;

  const [searchAgg, clickAgg] = await Promise.all([
    esClient.search({
      index: "analiticos-buscas",
      size: 0,
      query: { range: { carimbo_tempo: { gte: startMs, lte: now } } },
      aggs: {
        total_searches: { value_count: { field: "id_consulta" } },
        zero_results: { filter: { term: { total: 0 } } },
      },
    }),
    esClient.search({
      index: "analiticos-cliques",
      size: 0,
      query: { range: { carimbo_tempo: { gte: startMs, lte: now } } },
      aggs: {
        total_clicks: { value_count: { field: "id_documento" } },
        avg_position: { avg: { field: "posicao" } },
      },
    }),
  ]);

  const searches = (searchAgg.aggregations as any)?.total_searches?.value ?? 0;
  const zero = (searchAgg.aggregations as any)?.zero_results?.doc_count ?? 0;
  const clicks = (clickAgg.aggregations as any)?.total_clicks?.value ?? 0;
  const avgPosition = (clickAgg.aggregations as any)?.avg_position?.value ?? null;

  const ctr = searches > 0 ? clicks / searches : 0;
  const zeroRate = searches > 0 ? zero / searches : 0;

  res.json({ windowMinutes: minutes, searches, searchesZero: zero, clicks, ctr, zeroRate, avgPosition });
});

// Advanced metrics placeholder (MRR/NDCG approximations)
metricsRouter.get("/advanced", async (req, res) => {
  const minutes = Number((req.query.minutes as string) || 10);
  const k = Math.max(1, Number((req.query.k as string) || 10));
  const now = Date.now();
  const start = now - minutes * 60 * 1000;

  const searchesAgg = await esClient.search({
    index: "analiticos-buscas",
    size: 0,
    query: { range: { carimbo_tempo: { gte: start, lte: now } } },
    aggs: {
      total_searches: { value_count: { field: "id_consulta" } },
    },
  } as any);

  const clicksAgg = await esClient.search({
    index: "analiticos-cliques",
    size: 0,
    query: { range: { carimbo_tempo: { gte: start, lte: now } } },
    aggs: {
      by_query: {
        terms: { field: "id_consulta", size: 10000 },
        aggs: {
          positions: { top_hits: { size: 100, sort: [{ posicao: "asc" }], _source: { includes: ["posicao"] } } },
          min_pos: { min: { field: "posicao" } },
        },
      },
    },
  } as any);

  const totalSearches: number = (searchesAgg.aggregations as any)?.total_searches?.value ?? 0;

  const buckets: any[] = (clicksAgg.aggregations as any)?.by_query?.buckets ?? [];
  let mrrSum = 0;
  let ndcgSum = 0;
  let queriesWithClicks = 0;

  for (const b of buckets) {
    const minPos: number | null = b.min_pos?.value ?? null;
    // positions clicked for this query
    const hits: any[] = b.positions?.hits?.hits ?? [];
    const posList: number[] = hits.map((h: any) => Number(h._source.posicao)).filter((p: any) => Number.isFinite(p));
    const posWithinK = posList.filter((p) => p >= 1 && p <= k);

    if (minPos && Number.isFinite(minPos)) {
      mrrSum += 1 / minPos;
    }

    if (posWithinK.length > 0) {
      // DCG from clicked positions (binary gains)
      const dcg = posWithinK.reduce((acc, p) => acc + 1 / Math.log2(1 + p), 0);
      // Ideal DCG for m clicks is clicks at ranks 1..m
      const m = posWithinK.length;
      const idcg = Array.from({ length: Math.min(m, k) }, (_, i) => 1 / Math.log2(2 + i)).reduce((a, b) => a + b, 0);
      const ndcg = idcg > 0 ? dcg / idcg : 0;
      ndcgSum += ndcg;
      queriesWithClicks += 1;
    }
  }

  const mrr = buckets.length > 0 ? mrrSum / buckets.length : 0;
  const ndcg = queriesWithClicks > 0 ? ndcgSum / queriesWithClicks : 0;

  res.json({ windowMinutes: minutes, k, totalSearches, queriesWithClicks, mrr, ndcg });
});

// Latest metrics snapshot from analytics-metrics index
metricsRouter.get("/analytics", async (req, res) => {
  const resp = await esClient.search({
    index: "analiticos-metricas",
    size: 1,
    sort: [{ timestamp: "desc" }],
  } as any);

  const hit: any = resp.hits.hits[0]?. _source;
  if (!hit) {
    return res.json({ searches: 0, clicks: 0, ctr: 0, zeroRate: 0, avgPosition: null });
  }
  return res.json({
    searches: hit.buscas ?? 0,
    clicks: hit.cliques ?? 0,
    ctr: hit.ctr ?? 0,
    zeroRate: hit.taxa_zero_resultados ?? 0,
    avgPosition: hit.posicao_media ?? null,
    timestamp: hit.carimbo_tempo,
  });
});



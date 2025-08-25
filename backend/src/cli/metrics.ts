import "../apm";
import { esClient } from "../es/client";

async function run() {
  const windowMinutes = Number(process.env.METRICS_WINDOW_MINUTES || 10);
  const now = Date.now();
  const start = now - windowMinutes * 60 * 1000;

  const searchesAgg = await esClient.search({
    index: "analiticos-buscas",
    size: 0,
    query: { range: { carimbo_tempo: { gte: start, lte: now } } },
    aggs: {
      total_searches: { value_count: { field: "id_consulta" } },
      zero_results: { filter: { term: { total: 0 } } },
    },
  });
  const clicksAgg = await esClient.search({
    index: "analiticos-cliques",
    size: 0,
    query: { range: { carimbo_tempo: { gte: start, lte: now } } },
    aggs: {
      total_clicks: { value_count: { field: "id_documento" } },
      clicks_rank_1: { filter: { term: { posicao: 1 } } },
    },
  });

  const searchesTotal = (searchesAgg.aggregations as any)?.total_searches?.value ?? 0;
  const zero = (searchesAgg.aggregations as any)?.zero_results?.doc_count ?? 0;
  const clicksTotal = (clicksAgg.aggregations as any)?.total_clicks?.value ?? 0;
  const clicksAt1 = (clicksAgg.aggregations as any)?.clicks_rank_1?.doc_count ?? 0;

  const ctr = searchesTotal > 0 ? clicksTotal / searchesTotal : 0;
  const ctrAt1 = searchesTotal > 0 ? clicksAt1 / searchesTotal : 0;
  const zeroRate = searchesTotal > 0 ? zero / searchesTotal : 0;

  // Relatório em pt_BR
  // eslint-disable-next-line no-console
  console.log(`Métricas de Busca (CLI) — janela: ${windowMinutes} min`);
  // eslint-disable-next-line no-console
  console.log(`Total de Buscas: ${searchesTotal}`);
  // eslint-disable-next-line no-console
  console.log(`Zero-Results (%): ${(zeroRate * 100).toFixed(2)}%`);
  // eslint-disable-next-line no-console
  console.log(`CTR Geral: ${(ctr * 100).toFixed(2)}%`);
  // eslint-disable-next-line no-console
  console.log(`CTR@1: ${(ctrAt1 * 100).toFixed(2)}%`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});



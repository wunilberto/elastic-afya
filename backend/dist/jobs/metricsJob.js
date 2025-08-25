"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMetricsJob = startMetricsJob;
const client_1 = require("../es/client");
const logger_1 = require("../logger");
const config_1 = require("../config");
async function computeMetricsMinutes(windowMinutes) {
    const now = Date.now();
    const gte = now - windowMinutes * 60 * 1000;
    const [searchAgg, clickAgg] = await Promise.all([
        client_1.esClient.search({
            index: "analiticos-buscas",
            size: 0,
            query: { range: { carimbo_tempo: { gte, lte: now } } },
            aggs: {
                total_searches: { value_count: { field: "id_consulta" } },
                zero_results: { filter: { term: { total: 0 } } },
            },
        }),
        client_1.esClient.search({
            index: "analiticos-cliques",
            size: 0,
            query: { range: { carimbo_tempo: { gte, lte: now } } },
            aggs: {
                total_clicks: { value_count: { field: "id_documento" } },
                clicks_rank_1: { filter: { term: { posicao: 1 } } },
                avg_position: { avg: { field: "posicao" } },
            },
        }),
    ]);
    const searches = searchAgg.aggregations?.total_searches?.value ?? 0;
    const zero = searchAgg.aggregations?.zero_results?.doc_count ?? 0;
    const clicks = clickAgg.aggregations?.total_clicks?.value ?? 0;
    const ctr = searches > 0 ? clicks / searches : 0;
    const ctrAt1 = searches > 0 ? (clickAgg.aggregations?.clicks_rank_1?.doc_count ?? 0) / searches : 0;
    const avgRank = clickAgg.aggregations?.avg_position?.value ?? null;
    return {
        tipo_periodo: 'minutos',
        periodo_minutos: windowMinutes,
        periodo_dias: null,
        periodo_inicio: gte,
        periodo_fim: now,
        buscas: searches,
        buscas_zero: zero,
        taxa_zero_resultados: searches ? zero / searches : 0,
        cliques: clicks,
        ctr,
        ctr_top1: ctrAt1,
        posicao_media: avgRank,
        carimbo_tempo: now,
    };
}
function startMetricsJob() {
    if (!config_1.config.metrics.jobEnabled) {
        logger_1.logger.info("Metrics job disabled");
        return;
    }
    const tick = async () => {
        try {
            const doc = await computeMetricsMinutes(config_1.config.metrics.windowMinutes || Math.max(1, Math.floor(config_1.config.metrics.jobIntervalMs / 60000)));
            await client_1.esClient.index({ index: "analiticos-metricas", document: doc, refresh: false });
            logger_1.logger.info({ doc }, "Metrics snapshot indexed");
        }
        catch (err) {
            logger_1.logger.error({ err }, "Metrics job error");
        }
    };
    // run now and schedule
    tick();
    setInterval(tick, config_1.config.metrics.jobIntervalMs).unref();
}

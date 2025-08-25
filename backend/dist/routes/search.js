"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("../es/client");
const crypto_1 = require("crypto");
exports.searchRouter = (0, express_1.Router)();
const SearchQuerySchema = zod_1.z.object({
    q: zod_1.z.string().min(0),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    size: zod_1.z.coerce.number().int().min(1).max(100).default(10),
    type: zod_1.z.enum(["product", "article", "event", "all"]).default("all"),
    sort: zod_1.z.enum(["relevance", "recent", "popular"]).default("relevance"),
});
exports.searchRouter.get("/", async (req, res) => {
    const parsed = SearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { q, page, size, type, sort } = parsed.data;
    const from = (page - 1) * size;
    const indices = type === "all" ? ["products", "articles", "events"] : [`${type}s`];
    const must = [];
    const should = [];
    if (q && q.trim().length > 0) {
        // Simple query-time synonyms expansion (PT/EN examples)
        const synonyms = {
            "js": ["javascript", "node", "nodejs"],
            "javascript": ["js", "nodejs"],
            "elasticsearch": ["es", "elastic search"],
            "curso": ["formacao", "treinamento"],
            "evento": ["workshop", "meetup"],
            "artigo": ["post", "blog"],
        };
        const lower = q.toLowerCase();
        const expanded = new Set([q]);
        Object.entries(synonyms).forEach(([k, vals]) => {
            if (lower.includes(k))
                vals.forEach(v => expanded.add(v));
        });
        should.push({ match_phrase: { "title": { query: q, boost: 3 } } }, { multi_match: {
                query: q,
                type: "most_fields",
                fields: [
                    "title^3",
                    "title.ngram^2",
                    "description^1",
                    "description.ngram^0.5",
                    "categories^1",
                    "tags^1",
                ],
                fuzziness: "AUTO",
                tie_breaker: 0.2
            }
        }, { match: { "title.autocomplete": { query: q, boost: 5 } } });
        // Add synonym queries with lower boost
        for (const alt of Array.from(expanded).filter(t => t !== q)) {
            should.push({ multi_match: { query: alt, type: "most_fields", fields: ["title^2", "title.ngram^1", "description^0.5"], fuzziness: "AUTO", tie_breaker: 0.2 } });
        }
    }
    else {
        should.push({ match_all: {} });
    }
    const baseQuery = {
        bool: { must, should, minimum_should_match: 1 },
    };
    const body = {
        index: indices,
        from,
        size,
        query: sort === "relevance"
            ? {
                function_score: {
                    query: baseQuery,
                    boost_mode: "multiply",
                    score_mode: "multiply",
                    functions: [
                        { field_value_factor: { field: "popularity_score", modifier: "log1p", missing: 0 } },
                        { gauss: { updated_at: { origin: "now", scale: "30d", offset: "7d", decay: 0.5 } } },
                    ],
                },
            }
            : baseQuery,
        highlight: {
            pre_tags: ["<mark>"],
            post_tags: ["</mark>"],
            fields: { title: {}, description: {} },
        },
        sort: sort === "recent"
            ? [{ updated_at: "desc" }]
            : sort === "popular"
                ? [{ popularity_score: "desc" }]
                : [{ _score: "desc" }],
    };
    const esResponse = await client_1.esClient.search(body);
    const hits = esResponse.hits.hits.map((h) => ({ id: h._id, index: h._index, score: h._score, ...h._source, highlight: h.highlight }));
    const total = typeof esResponse.hits.total === "object" ? esResponse.hits.total.value : esResponse.hits.total;
    const query_id = (0, crypto_1.randomUUID)();
    // async log search analytics
    try {
        await client_1.esClient.index({ index: "analiticos-buscas", document: { id_consulta: query_id, termo: q, total, carimbo_tempo: Date.now() }, refresh: "false" });
    }
    catch {
        // ignore analytics errors
    }
    res.json({
        total,
        hits,
        page,
        size,
        query_id,
    });
});

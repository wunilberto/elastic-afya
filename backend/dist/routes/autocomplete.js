"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.autocompleteRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("../es/client");
exports.autocompleteRouter = (0, express_1.Router)();
const QuerySchema = zod_1.z.object({
    q: zod_1.z.string().min(1),
    size: zod_1.z.coerce.number().int().min(1).max(20).default(10),
});
// GET /api/autocomplete/products?q=
exports.autocompleteRouter.get("/products", async (req, res) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { q, size } = parsed.data;
    const folded = q
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^\p{L}\p{N}\s]+/gu, ' ');
    const response = await client_1.esClient.search({
        index: "products",
        size,
        _source: ["title", "url"],
        query: {
            bool: {
                should: [
                    { multi_match: { query: q, type: "bool_prefix", fields: ["title.autocomplete", "title.autocomplete._2gram", "title.autocomplete._3gram"] } },
                    { multi_match: { query: folded, type: "bool_prefix", fields: ["title.autocomplete", "title.autocomplete._2gram", "title.autocomplete._3gram"] } },
                ],
                minimum_should_match: 1,
            }
        },
    });
    const suggestions = response.hits.hits.map(h => ({ id: h._id, title: h._source.title, url: h._source.url }));
    res.json({ suggestions });
});
// GET /api/autocomplete/suggest?q=  (completion suggester)
exports.autocompleteRouter.get("/suggest", async (req, res) => {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { q, size } = parsed.data;
    const folded = q
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^\p{L}\p{N}\s]+/gu, ' ');
    // Fallback to edge_ngram fields since we haven't defined a completion field
    const response = await client_1.esClient.search({
        index: "products",
        size,
        _source: ["title", "url"],
        query: {
            bool: {
                should: [
                    { multi_match: { query: q, type: "bool_prefix", fields: ["title.ngram", "title^0.5"] } },
                    { multi_match: { query: folded, type: "bool_prefix", fields: ["title.ngram", "title^0.5"] } },
                ],
                minimum_should_match: 1,
            }
        },
    });
    const suggestions = response.hits.hits.map(h => ({ id: h._id, title: h._source.title, url: h._source.url }));
    res.json({ suggestions });
});

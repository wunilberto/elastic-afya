import { Router } from "express";
import { z } from "zod";
import { esClient } from "../es/client";
import { randomUUID } from "crypto";

export const searchRouter = Router();

const SearchQuerySchema = z.object({
  q: z.string().min(0),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(10),
  type: z.enum(["product", "article", "event", "all"]).default("all"),
  sort: z.enum(["relevance", "recent", "popular"]).default("relevance"),
});

searchRouter.get("/", async (req, res) => {
  const parsed = SearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { q, page, size, type, sort } = parsed.data;
  const from = (page - 1) * size;

  const indices = type === "all" ? ["products", "articles", "events"] : [`${type}s`];

  const must: any[] = [];
  const should: any[] = [];

  if (q && q.trim().length > 0) {
    // Sinonimos (PT/EN)
    const synonyms: Record<string, string[]> = {
      "js": ["javascript", "node", "nodejs"],
      "javascript": ["js", "nodejs"],
      "elasticsearch": ["es", "elastic search"],
      "curso": ["formacao", "treinamento"],
      "evento": ["workshop", "meetup"],
      "artigo": ["post", "blog"],
    };
    const lower = q.toLowerCase();
    const expanded = new Set<string>([q]);
    Object.entries(synonyms).forEach(([k, vals]) => {
      if (lower.includes(k)) vals.forEach(v => expanded.add(v));
    });

    should.push(
      { match_phrase: { "title": { query: q, boost: 3 } } },
      { multi_match: {
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
      },
      { match: { "title.autocomplete": { query: q, boost: 5 } } }
    );

    // Add synonym queries with lower boost
    for (const alt of Array.from(expanded).filter(t => t !== q)) {
      should.push({ multi_match: { query: alt, type: "most_fields", fields: ["title^2","title.ngram^1","description^0.5"], fuzziness: "AUTO", tie_breaker: 0.2 } });
    }
  } else {
    should.push({ match_all: {} });
  }

  const baseQuery = {
    bool: { must, should, minimum_should_match: 1 },
  };

  const body: Record<string, any> = {
    index: indices,
    from,
    size,
    query:
      sort === "relevance"
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
    sort:
      sort === "recent"
        ? [{ updated_at: "desc" }]
        : sort === "popular"
        ? [{ popularity_score: "desc" }]
        : [{ _score: "desc" }],
  };

  const esResponse = await esClient.search(body as any);
  const hits = esResponse.hits.hits.map((h: any) => ({ id: h._id, index: h._index, score: h._score, ...h._source, highlight: h.highlight }));
  const total = typeof esResponse.hits.total === "object" ? esResponse.hits.total.value : esResponse.hits.total;
  const query_id = randomUUID();
  // async log search analytics
  try {
    await esClient.index({ index: "analiticos-buscas", document: { id_consulta: query_id, termo: q, total, carimbo_tempo: Date.now() }, refresh: "false" });
  } catch {
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



import { Router } from "express";
import { z } from "zod";
import { esClient } from "../es/client";

export const autocompleteRouter = Router();

const QuerySchema = z.object({
  q: z.string().min(1),
  size: z.coerce.number().int().min(1).max(20).default(10),
});

// GET /api/autocomplete/products?q=
autocompleteRouter.get("/products", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { q, size } = parsed.data;
  const folded = q
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ');

  const response = await esClient.search({
    index: "products",
    size,
    _source: ["title", "url"],
    query: {
      bool: {
        should: [
          { multi_match: { query: q, type: "bool_prefix", fields: ["title.autocomplete","title.autocomplete._2gram","title.autocomplete._3gram"] } },
          { multi_match: { query: folded, type: "bool_prefix", fields: ["title.autocomplete","title.autocomplete._2gram","title.autocomplete._3gram"] } },
        ],
        minimum_should_match: 1,
      }
    },
  } as any);

  const suggestions = (response.hits.hits as any[]).map(h => ({ id: h._id, title: h._source.title, url: h._source.url }));
  res.json({ suggestions });
});

// GET /api/autocomplete/suggest?q=  (completion suggester)
autocompleteRouter.get("/suggest", async (req, res) => {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { q, size } = parsed.data;
  const folded = q
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ');

  // Fallback to edge_ngram fields since we haven't defined a completion field
  const response = await esClient.search({
    index: "products",
    size,
    _source: ["title", "url"],
    query: {
      bool: {
        should: [
          { multi_match: { query: q, type: "bool_prefix", fields: ["title.ngram","title^0.5"] } },
          { multi_match: { query: folded, type: "bool_prefix", fields: ["title.ngram","title^0.5"] } },
        ],
        minimum_should_match: 1,
      }
    },
  } as any);
  const suggestions = (response.hits.hits as any[]).map(h => ({ id: h._id, title: h._source.title, url: h._source.url }));
  res.json({ suggestions });
});



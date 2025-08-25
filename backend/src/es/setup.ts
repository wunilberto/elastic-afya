import { esClient } from "./client";
import { logger } from "../logger";

async function ensureIndex(name: string, body: Record<string, any>) {
  const exists = await esClient.indices.exists({ index: name });
  if (!exists) {
    await esClient.indices.create({ index: name, ...body });
    logger.info({ index: name }, "Created index");
  } else {
    logger.info({ index: name }, "Index exists");
  }
}

async function run() {
  const commonSettings = {
    settings: {
      analysis: {
        filter: {
          brazilian_stop: { type: "stop", stopwords: "_brazilian_" },
          brazilian_stemmer: { type: "stemmer", language: "brazilian" },
          english_stop: { type: "stop", stopwords: "_english_" },
          english_stemmer: { type: "stemmer", language: "english" },
          edge_ngram_2_20: { type: "edge_ngram", min_gram: 2, max_gram: 20 },
        },
        analyzer: {
          text_pt: {
            tokenizer: "standard",
            filter: ["lowercase", "asciifolding", "brazilian_stop", "brazilian_stemmer"],
          },
          text_en: {
            tokenizer: "standard",
            filter: ["lowercase", "asciifolding", "english_stop", "english_stemmer"],
          },
          text_ngram: {
            tokenizer: "standard",
            filter: ["lowercase", "asciifolding", "edge_ngram_2_20"],
          },
          text_autocomplete: {
            tokenizer: "standard",
            filter: ["lowercase", "asciifolding"],
          },
        },
        normalizer: {
          kw_norm: {
            type: "custom",
            filter: ["lowercase", "asciifolding"],
          },
        },
      },
    },
    mappings: {
      dynamic: false,
      properties: {
        title: {
          type: "text",
          analyzer: "text_pt",
          fields: {
            en: { type: "text", analyzer: "text_en" },
            ngram: { type: "text", analyzer: "text_ngram" },
            autocomplete: { type: "search_as_you_type" },
            keyword: { type: "keyword", ignore_above: 256, normalizer: "kw_norm" },
          },
        },
        description: { type: "text", analyzer: "text_pt", fields: { en: { type: "text", analyzer: "text_en" }, ngram: { type: "text", analyzer: "text_ngram" } } },
        categories: { type: "keyword", normalizer: "kw_norm" },
        tags: { type: "keyword", normalizer: "kw_norm" },
        popularity_score: { type: "float" },
        updated_at: { type: "date" },
        type: { type: "keyword" },
        url: { type: "keyword" },
      },
    },
  };

  await ensureIndex("products", commonSettings);
  await ensureIndex("articles", commonSettings);
  await ensureIndex("events", commonSettings);

  // Índices analíticos (pt_BR)
  await ensureIndex("analiticos-buscas", {
    mappings: {
      properties: {
        id_consulta: { type: "keyword" },
        termo: { type: "keyword" },
        total: { type: "integer" },
        carimbo_tempo: { type: "date", format: "epoch_millis" },
      },
    },
  });

  await ensureIndex("analiticos-cliques", {
    mappings: {
      properties: {
        id_consulta: { type: "keyword" },
        id_documento: { type: "keyword" },
        posicao: { type: "integer" },
        carimbo_tempo: { type: "date", format: "epoch_millis" },
      },
    },
  });

  await ensureIndex("analiticos-metricas", {
    mappings: {
      properties: {
        tipo_periodo: { type: "keyword" },
        periodo_minutos: { type: "integer" },
        periodo_dias: { type: "integer" },
        periodo_inicio: { type: "date", format: "epoch_millis" },
        periodo_fim: { type: "date", format: "epoch_millis" },
        buscas: { type: "integer" },
        buscas_zero: { type: "integer" },
        taxa_zero_resultados: { type: "float" },
        cliques: { type: "integer" },
        ctr: { type: "float" },
        ctr_top1: { type: "float" },
        posicao_media: { type: "float" },
        carimbo_tempo: { type: "date", format: "epoch_millis" },
      },
    },
  });

  logger.info("Setup complete");
}

run().catch((err) => {
  logger.error({ err }, "Setup failed");
  process.exit(1);
});



## Desafio criado para o Teste da empresa Afya

# Escopo
 - O que você vai construir
 Você criará um Search Service simplificado que:
1. Indexa dados heterogêneos (Products, Articles, Events) em Elasticsearch 8.x. (Feito)
2. Expõe um endpoint REST GET /search com filtros, paginação e ordenação por relevância, popularidade e recência. (Feito)
3. Registra métricas de uso da busca e calcula indicadores básicos de qualidade. (Feito)
4. Documenta suas escolhas técnicas e próximos passos. (Feito)

# Search Service (Node.js + Elasticsearch 8)
Criando o Backend em node.Js que é a stack que informado no roteiro e que nos ultimos anos é a que tenho mais desenvolvido projetos

O Elasticsearch já tenho familiaridade devido ao tempo de trabalho com essa stack, não só em integração com o sistema mais na manutenabilidade em servidores AWS e on-primesse.

A criação do React com o VITE devido a agilidade na apresentação e apresentação dos dados de uma forma mais simples.

## Arquitetura
- Backend: Node 20+, Express + TypeScript.
- Elasticsearch: 8.x (local via Docker).
- Clientes/Libs: `@elastic/elasticsearch`, `zod`, `pino`, `elastic-apm-node` (opcional).
- React + Vite

##Projeto Backend:
- `backend/src/index.ts` — servidor Express e rotas.
- `backend/src/routes/search.ts` — `GET /api/search` (relevância, filtros, paginação, sort).
- `backend/src/routes/analytics.ts` — `POST /api/analytics/click`.
- `backend/src/routes/metrics.ts` — `GET /api/metrics/kpis` (CTR, zero-results, avg rank@1).
- `backend/src/es/setup.ts` — criação de índices e mappings.
- `backend/src/es/seed.ts` — inserir ~30 documentos (products/articles/events).
- `backend/src/cli/metrics.ts` — script CLI para métricas agregadas.
- `backend/src/es/client.ts` — cliente Elasticsearch (cloudId/node + auth).
- `backend/src/apm.ts` — inicialização do APM.

## Passo a passo (≤ 10 min)
1) Instalar dependências
```bash
cd backend
npm install
```

2) Configurar variáveis de ambiente (`backend/.env`)
```bash
# App
NODE_ENV=development
PORT=4000

# Conexão ES (escolha UMA estratégia)
# 2.1) URL do node (local/docker)
ELASTIC_NODE=https://localhost:9200
ELASTIC_USERNAME=elastic
ELASTIC_PASSWORD=changeme
# 2.2) Elastic Cloud
# ELASTIC_CLOUD_ID=...
# ELASTIC_API_KEY=...

# TLS (self-signed em dev)
ELASTIC_TLS_REJECT_UNAUTHORIZED=false

# APM (opcional)
APM_ACTIVE=false
APM_SERVICE_NAME=search-service
APM_SERVER_URL=http://localhost:8200
APM_SECRET_TOKEN=
```
Dica: com Docker local e certificado self-signed, mantenha `ELASTIC_TLS_REJECT_UNAUTHORIZED=false` apenas em dev.

3) (Opcional) Subir ES local (sem segurança) — DEMO
```bash
docker run -p 9200:9200 -p 9300:9300 \
  -e discovery.type=single-node \
  -e xpack.security.enabled=false \
  docker.elastic.co/elasticsearch/elasticsearch:8.15.3
```

4) Criar índices e mappings
```bash
npm run setup:indices
```
O script cria os índices `products`, `articles`, `events` com `dynamic:false`, analyzers PT/EN, multi-fields (text/en/ngram/keyword) e normalizer para keywords. Cria também `analytics-searches` e `analytics-clicks`.

5) Popular com ~30 documentos
```bash
npm run seed
```

6) Rodar a API
```bash
npm run dev
# ou
npm run build && npm start
```

7) Verificar saúde
```bash
curl -s http://localhost:4000/health | jq
```

## API
### GET /api/search
Parâmetros
- `q`: termo da busca (string; pode ser vazio)
- `type`: `product|article|event|all` (padrão `all`)
- `page`: inteiro ≥ 1 (padrão 1)
- `size`: 1..100 (padrão 10)
- `sort`: `relevance|recent|popular` (padrão `relevance`)

Exemplos
```bash
curl -s "http://localhost:4000/api/search?q=node&type=all&page=1&size=10" | jq
curl -s "http://localhost:4000/api/search?q=elasticsearch&sort=recent" | jq
curl -s "http://localhost:4000/api/search?q=relevancia&type=article&sort=popular" | jq
```
Resposta (resumo)
```json
{
  "total": 25,
  "hits": [{ "id": "...", "index": "products", "title": "...", "highlight": {"title": ["..."]} }],
  "page": 1,
  "size": 10,
  "query_id": "<uuid>"
}
```
Observação: toda busca é registrada em `analytics-searches` com `{ query_id, q, total, timestamp }`.

### POST /api/analytics/click
Body
```json
{ "query_id": "<uuid-da-busca>", "doc_id": "<_id>", "rank": 1, "timestamp": 1710000000000 }
```
Exemplo
```bash
curl -X POST http://localhost:4000/api/analytics/click \
  -H 'Content-Type: application/json' \
  -d '{"query_id":"<substitua>","doc_id":"<substitua>","rank":1}'
```

### GET /api/metrics/kpis
Retorna KPIs em 7 dias: `searches`, `clicks`, `ctr`, `zeroRate`, `avgPosition`.
```bash
curl -s http://localhost:4000/api/metrics/kpis | jq
```

## Relevância — explicação didática
- Texto: `title` e `description` têm analyzers PT e EN e campo `ngram` para matches parciais; `title.autocomplete` suporta search-as-you-type.
- Relevância (sort=relevance):
  - `function_score` combina:
    - `field_value_factor` em `popularity_score` com `modifier=log1p`.
    - `gauss` em `updated_at` favorecendo documentos recentes (decay com `scale=30d`, `offset=7d`).
- Ordenação alternativa:
  - `recent`: `updated_at desc`.
  - `popular`: `popularity_score desc`.

## Métricas
- Coleta
  - Busca: `analytics-searches` com `{ query_id, q, total, timestamp }`.
  - Clique: `analytics-clicks` com `{ query_id, doc_id, rank, timestamp }`.
- Relatório CLI
```bash
npm run metrics
```
Mostra total de buscas, zero-results rate, CTR geral e CTR@1.

## APM (opcional)
- Ative com `APM_ACTIVE=true` no `.env` e configure `APM_SERVICE_NAME`, `APM_SERVER_URL`, `APM_SECRET_TOKEN`.
- A inicialização acontece em `backend/src/apm.ts` e é importada em `backend/src/index.ts`.

## Decisões técnicas
- Modelo de relevância simples e transparente (texto + popularidade + recência).
- `dynamic:false` para controle de schema e performance.
- Analytics mínimos para indicadores essenciais (CTR, zero-results).
- CLI de métricas simples para ser executada por qualquer desenvolvedor.

## Próximos passos sugeridos
- Autocomplete no frontend (usar `title.autocomplete`).
- Sinônimos PT/EN em filtros customizados.
- Dashboard React para CTR, Zero-Results, top queries e cliques.
- Métricas avançadas: MRR, NDCG (requer rotulagem/julgamentos).
- Explorar Learning to Rank conforme maturidade de dados.

## Troubleshooting
- Conexão ES: valide `ELASTIC_NODE`/`ELASTIC_CLOUD_ID` e credenciais.
- Certificados: para self-signed em dev, `ELASTIC_TLS_REJECT_UNAUTHORIZED=false`.
- Índices ausentes: rode `npm run setup:indices`.
- Sem documentos: rode `npm run seed`.

---
Qualquer dúvida, abra os arquivos citados neste README e execute os comandos de exemplo. Boa apresentação! 💪

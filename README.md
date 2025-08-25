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
## Implantação simplificada
```bash
chmod +x run.sh
./run.sh
```

## Implantação Manual
1) Incluir Váriaveis de Ambiente
# Varaveis de ambiente do projeto
ELASTIC_PASSWORD="${ELASTIC_PASSWORD:-changeme}"
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_URL="${ES_URL:-http://localhost:9200}"
APM_URL="${APM_URL:-http://localhost:8200}"
BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

2) Compilação dos projetos
```bash
#Backend
docker compose build backend
#frontend
docker compose build frontend
#Executando as stacks
docker compose up -d
#Executar a alteração de senha do Kibana, para que o user kibana_system funcione corretamente
curl -s -u elastic:"$ELASTIC_PASSWORD" -X POST "$ES_URL/_security/user/kibana_system/_password" \
	-H 'Content-Type: application/json' \
	-d '{"password":"'"$ELASTIC_PASSWORD"'"}'
#Criando os indices
#O script cria os índices `products`, `articles`, `events` com `dynamic:false`, analyzers PT/EN, multi-fields (text/en/ngram/keyword) #e normalizer para keywords.
docker compose exec -T backend node dist/es/setup.js
#Criando os seeds
docker compose exec -T backend node dist/es/seed.js
#Atualizando as metricas
docker compose exec -T backend node dist/cli/metrics.js
```

## API
### GET /api/search
Parâmetros
- `q`: termo da busca (string; pode ser vazio)
- `type`: `product|article|event|all` (padrão `all`)
- `page`: inteiro ≥ 1 (padrão 1)
- `size`: 1..100 (padrão 10)
- `sort`: `relevance|recent|popular` (padrão `relevance`)

Exemplos de URLs
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
Observação: toda busca é registrada em `analiticos-buscas` com `{ query_id, q, total, timestamp }`.

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
  - Busca: `analiticos-buscas` com `{ query_id, q, total, timestamp }`.
  - Clique: `analiticos-cliques` com `{ query_id, doc_id, rank, timestamp }`.

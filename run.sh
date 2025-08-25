## Script para rodar o projeto
## 
## Para rodar o projeto, basta executar o comando:
## chmod +x run.sh
## ./run.sh
## Subira todas os containers necessários para o projeto e os seeds

#!/bin/sh
set -e

# Varaveis de ambiente do projeto
ELASTIC_PASSWORD="${ELASTIC_PASSWORD:-changeme}"
KIBANA_URL="${KIBANA_URL:-http://localhost:5601}"
ES_URL="${ES_URL:-http://localhost:9200}"
APM_URL="${APM_URL:-http://localhost:8200}"
BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

echo "Using ELASTIC_PASSWORD=********"

# Ensure Docker is running
if ! docker info >/dev/null 2>&1; then
	echo "Precisamos do Docker para rodar o projeto." >&2
	exit 1
fi

# Copilando as imagens do projeto
if [ -f ./backend/Dockerfile ]; then
	echo "Building backend..."
	docker compose build backend || true
fi
if [ -f ./frontend/Dockerfile ]; then
	echo "Building frontend..."
	docker compose build frontend || true
fi

# Bring up stack
export ELASTIC_PASSWORD

echo "Iniciando o compose para execução dos containers..."
docker compose up -d

# Monitorando o Elasticsearch
printf "Esperando o Elasticsearch %s ...\n" "$ES_URL"
for i in $(seq 1 60); do
	if curl -s -u elastic:"$ELASTIC_PASSWORD" "$ES_URL" >/dev/null 2>&1; then
		break
	fi
	sleep 2
	done

# Recriando a senha do kibana_system pois ele é sobrescrevido pelo docker compose quando o container é criado
echo "Ensuring kibana_system password..."
curl -s -u elastic:"$ELASTIC_PASSWORD" -X POST "$ES_URL/_security/user/kibana_system/_password" \
	-H 'Content-Type: application/json' \
	-d '{"password":"'"$ELASTIC_PASSWORD"'"}' >/dev/null || true

# Esperando o Backend para iniciar para rodar o setup e o seed
printf "Aguardando o Backend at %s/health ...\n" "$BACKEND_URL"
for i in $(seq 1 60); do
	STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health" || true)
	if [ "$STATUS" = "200" ]; then
		break
	fi
	sleep 2
	done

# Comandos para subir os indices e os seeds
if docker compose ps | grep -q search-backend; then
	echo "Running setup:indices inside backend container..."
	docker compose exec -T backend node dist/es/setup.js || true
	echo "Seeding documents inside backend container..."
	docker compose exec -T backend node dist/es/seed.js || true
    docker compose exec -T backend node dist/cli/metrics.js || true
fi

# Aguardando o Frontend
printf "Aguardando o Frontend at %s ...\n" "$FRONTEND_URL"
for i in $(seq 1 60); do
	STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" || true)
	if [ "$STATUS" = "200" ] || [ "$STATUS" = "301" ] || [ "$STATUS" = "302" ]; then
		break
	fi
	sleep 2
	done

# Basic checks
echo "Checking Elasticsearch info:"
curl -s -u elastic:"$ELASTIC_PASSWORD" "$ES_URL" | jq '.cluster_name,.version.number' || true

echo "Checking Kibana status:"
curl -s "$KIBANA_URL/api/status" | jq '.name,.status.overall.state' || true

echo "Checking Backend health:"
curl -s "$BACKEND_URL/health" | jq || true

echo "Checking Frontend status code:"
curl -s -o /dev/null -w "%{http_code}\n" "$FRONTEND_URL" || true

echo "Checking APM server version:"
curl -s "$APM_URL/" | jq '.version' || true

# Show service list
echo "Compose services:"
docker compose ps

cat <<EOF

Stack started.
- Elasticsearch: $ES_URL (user: elastic / pass: <hidden>)
- Kibana:       $KIBANA_URL
- Backend:      $BACKEND_URL
- Frontend:     $FRONTEND_URL
- APM Server:   $APM_URL

EOF

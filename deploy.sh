#!/usr/bin/env bash
# =============================================================================
# AuraLearn / R26-SE-022 — Full VM Deployment Script
# Target: Oracle Cloud VM  |  User: root/opc  |  OS: Oracle Linux / Ubuntu
# Branch: Common-integration-all-components
# Services:
#   - Infrastructure  : PostgreSQL · Qdrant · Redis · MinIO  (Docker Compose)
#   - summarizer-backend        → port 8000  (Python / uvicorn, PM2)
#   - adaptive-reminder-backend → port 8001  (Python / uvicorn, PM2)
#   - llm-tutor-backend         → port 8002  (Python / uvicorn, PM2)
#   - Frontend (Next.js)        → port 3000  (PM2, production build)
#
# SECRETS: Copy secrets.env.example → secrets.env and fill in your keys.
#          secrets.env is gitignored and NEVER committed.
# =============================================================================
set -euo pipefail

# ── Colour helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}══ $* ══${NC}"; }

# ── Configuration ───────────────────────────────────────────────────────────
REPO_URL="https://github.com/Five-Gang/R26-SE-022.git"
BRANCH="Common-integration-all-components"
APP_DIR="$HOME/R26-SE-022"
VM_IP="129.146.71.78"

# ── Load secrets ─────────────────────────────────────────────────────────────
# Secrets file can live next to this script OR at $HOME/secrets.env on the VM
SECRETS_FILE=""
for candidate in "$(dirname "$0")/secrets.env" "$HOME/secrets.env"; do
  if [[ -f "$candidate" ]]; then
    SECRETS_FILE="$candidate"
    break
  fi
done

if [[ -z "$SECRETS_FILE" ]]; then
  error "secrets.env not found!\n\n  Copy secrets.env.example → secrets.env and fill in your API keys:\n    cp secrets.env.example secrets.env\n    nano secrets.env\n\n  Then re-run: bash deploy.sh"
fi

# shellcheck disable=SC1090
source "$SECRETS_FILE"
info "Loaded secrets from: $SECRETS_FILE"

# Validate required secrets
for var in OPENAI_API_KEY GOOGLE_API_KEY GEMINI_API_KEY SECRET_KEY MONGODB_URL JWT_SECRET; do
  if [[ -z "${!var:-}" ]]; then
    error "Required variable '$var' is not set in secrets.env"
  fi
done

# ── Detect OS ───────────────────────────────────────────────────────────────
detect_os() {
  if [ -f /etc/oracle-release ]; then
    echo "oracle"
  elif grep -qi ubuntu /etc/os-release 2>/dev/null; then
    echo "ubuntu"
  elif grep -qi "centos\|rhel\|fedora" /etc/os-release 2>/dev/null; then
    echo "rhel"
  else
    echo "unknown"
  fi
}
OS=$(detect_os)
info "Detected OS: $OS"

# =============================================================================
# STEP 1 — System packages
# =============================================================================
step "Installing system packages"

if [[ "$OS" == "oracle" || "$OS" == "rhel" ]]; then
  sudo dnf update -y -q
  sudo dnf install -y -q \
    git curl wget unzip gcc gcc-c++ make \
    python3 python3-pip python3-devel \
    openssl-devel bzip2-devel libffi-devel zlib-devel \
    mesa-libGL glib2 \
    firewalld

  sudo systemctl enable --now firewalld || true
  for port in 3000 8000 8001 8002 5432 6333 6334 6379 9000 9001; do
    sudo firewall-cmd --zone=public --add-port=${port}/tcp --permanent 2>/dev/null || true
  done
  sudo firewall-cmd --reload || true

elif [[ "$OS" == "ubuntu" ]]; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    git curl wget unzip build-essential \
    python3 python3-pip python3-venv python3-dev \
    libssl-dev libbz2-dev libffi-dev zlib1g-dev \
    libgl1-mesa-glx libglib2.0-0 \
    ufw

  for port in 3000 8000 8001 8002 5432 6333 6379 9000 9001; do
    sudo ufw allow ${port}/tcp 2>/dev/null || true
  done
  sudo ufw --force enable 2>/dev/null || true
fi

success "System packages installed"

# =============================================================================
# STEP 2 — Docker & Docker Compose
# =============================================================================
step "Installing Docker"

if ! command -v docker &>/dev/null; then
  info "Docker not found — installing via get.docker.com..."
  curl -fsSL https://get.docker.com | sudo bash
  sudo usermod -aG docker "$USER" || true
fi
sudo systemctl enable --now docker
DOCKER_CMD="sudo docker"

# Docker Compose v2 plugin
if ! sudo docker compose version &>/dev/null 2>&1; then
  info "Installing Docker Compose plugin..."
  COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest \
    | grep '"tag_name"' | head -1 | cut -d'"' -f4)
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -SL \
    "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
fi
success "Docker Compose: $(sudo docker compose version)"

# =============================================================================
# STEP 3 — Node.js 20 LTS + PM2
# =============================================================================
step "Installing Node.js 20 LTS + PM2"

if ! command -v node &>/dev/null; then
  if [[ "$OS" == "ubuntu" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs npm
  fi
fi
success "Node: $(node --version) | npm: $(npm --version)"

if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2
fi
success "PM2: $(pm2 --version)"

# =============================================================================
# STEP 4 — Python
# =============================================================================
step "Detecting Python interpreter"

PYTHON_BIN=""
for py in python3.12 python3.11 python3.10 python3; do
  if command -v "$py" &>/dev/null; then
    PYTHON_BIN=$(command -v "$py"); break
  fi
done
[[ -z "$PYTHON_BIN" ]] && error "No Python 3 found."
info "Python: $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"

# =============================================================================
# STEP 5 — Clone / update repository
# =============================================================================
step "Cloning repository (branch: $BRANCH)"

if [ -d "$APP_DIR/.git" ]; then
  warn "Repo already exists — pulling latest..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
success "Repository ready at $APP_DIR"

# =============================================================================
# STEP 6 — Write .env files (secrets injected from secrets.env)
# =============================================================================
step "Writing .env files"

# ── Root .env ─────────────────────────────────────────────────────────────
cat > "$APP_DIR/.env" <<ENVEOF
APP_NAME=loa-ess
APP_ENV=production
DEBUG=false
SECRET_KEY=${SECRET_KEY}
API_V1_PREFIX=/api/v1

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=loa_ess
POSTGRES_USER=loa_ess_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-change-me-in-production}

QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}
MINIO_BUCKET=loa-ess-documents
MINIO_SECURE=false

OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_LLM_MODEL=gpt-4o-mini

GOOGLE_API_KEY=${GOOGLE_API_KEY}
GEMINI_MODEL=gemini-2.5-flash

LLM_PROVIDER=gemini
LLM_TEMPERATURE_SUMMARY=0.3
LLM_TEMPERATURE_QUIZ=0.7
LLM_MAX_OUTPUT_TOKENS=4096

EMBEDDING_PROVIDER=google
EMBEDDING_DIMENSIONS=3072
LOCAL_EMBEDDING_MODEL=all-MiniLM-L6-v2

RETRIEVAL_TOP_K=20
RERANK_TOP_K=10
HYBRID_ALPHA=0.7
HYBRID_BETA=0.3

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

NEXT_PUBLIC_API_URL=http://${VM_IP}:8000
NEXT_PUBLIC_APP_NAME=LOA-ESS
ENVEOF

# ── summarizer-backend/.env ───────────────────────────────────────────────
cat > "$APP_DIR/summarizer-backend/.env" <<ENVEOF
APP_ENV=production
DEBUG=false
SECRET_KEY=${SECRET_KEY}

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=loa_ess
POSTGRES_USER=loa_ess_user
POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-change-me-in-production}

QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY:-minioadmin}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY:-minioadmin}
MINIO_BUCKET=loa-ess-documents
MINIO_SECURE=false

LLM_PROVIDER=gemini
GOOGLE_API_KEY=${GOOGLE_API_KEY}
GEMINI_MODEL=gemini-2.5-flash
OPENAI_API_KEY=${OPENAI_API_KEY}
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_LLM_MODEL=gpt-4o-mini

EMBEDDING_PROVIDER=google
EMBEDDING_DIMENSIONS=3072
LOCAL_EMBEDDING_MODEL=all-MiniLM-L6-v2

RETRIEVAL_TOP_K=20
RERANK_TOP_K=10
HYBRID_ALPHA=0.7
HYBRID_BETA=0.3

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
ENVEOF

# ── llm-tutor-backend/.env ───────────────────────────────────────────────
cat > "$APP_DIR/llm-tutor-backend/.env" <<ENVEOF
DEBUG=False
ENV=production

BACKEND_HOST=0.0.0.0
BACKEND_PORT=8002

FRONTEND_URL=http://${VM_IP}:3000

VECTORSTORE_PATH=data/chroma
VECTORSTORE_TYPE=chroma

PDF_CHUNK_SIZE=500
PDF_CHUNK_OVERLAP=50
PDF_UPLOAD_DIR=data/pdfs

EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

RETRIEVAL_TOP_K=5
SIMILARITY_THRESHOLD=0.3

LLM_PROVIDER=gemini
LLM_MODEL=gemini-2.5-flash
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=1024

GEMINI_API_KEY=${GEMINI_API_KEY}

CONFIDENCE_HIGH_THRESHOLD=0.75
CONFIDENCE_LOW_THRESHOLD=0.45
ENABLE_SELF_CONSISTENCY=True
SELF_CONSISTENCY_SAMPLES=3

OPENAI_API_KEY=${OPENAI_API_KEY}
ENVEOF

# ── adaptive-reminder-system/backend/.env ────────────────────────────────
cat > "$APP_DIR/adaptive-reminder-system/backend/.env" <<ENVEOF
MONGODB_URL=${MONGODB_URL}
MONGODB_DB=reminder_db

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE_MINUTES=1440

ENV=production

EMOTION_PROVIDER=http
EMOTION_SERVICE_URL=http://127.0.0.1:8002/api
ENVEOF

# ── Frontend/.env.local ──────────────────────────────────────────────────
cat > "$APP_DIR/Frontend/.env.local" <<ENVEOF
NEXT_PUBLIC_SUMMARIZER_API_URL=http://${VM_IP}:8000
NEXT_PUBLIC_API_URL=http://${VM_IP}:8001
NEXT_PUBLIC_TUTOR_API_URL=http://${VM_IP}:8002
NEXT_PUBLIC_EMOTION_API_URL=http://${VM_IP}:8004
ENVEOF

success "All .env files written"

# =============================================================================
# STEP 7 — Launch infrastructure (Docker Compose)
# =============================================================================
step "Starting infrastructure (PostgreSQL · Qdrant · Redis · MinIO)"

cd "$APP_DIR"
$DOCKER_CMD compose down --remove-orphans 2>/dev/null || true
$DOCKER_CMD compose up -d --wait
success "Infrastructure containers up"

# Wait for PostgreSQL
info "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if $DOCKER_CMD exec loa-ess-postgres pg_isready -U loa_ess_user -d loa_ess &>/dev/null; then
    success "PostgreSQL ready"; break
  fi
  sleep 2
done

# Wait for Redis
info "Waiting for Redis..."
for i in $(seq 1 20); do
  if $DOCKER_CMD exec loa-ess-redis redis-cli ping 2>/dev/null | grep -q PONG; then
    success "Redis ready"; break
  fi
  sleep 2
done

# =============================================================================
# STEP 8 — summarizer-backend  (port 8000)
# =============================================================================
step "summarizer-backend (port 8000)"

cd "$APP_DIR/summarizer-backend"
"$PYTHON_BIN" -m venv .venv --upgrade-deps
source .venv/bin/activate
pip install --upgrade pip wheel -q
pip install -r requirements.txt -q

if [ -f alembic.ini ]; then
  info "Running Alembic migrations..."
  alembic upgrade head || warn "Alembic migration failed — continuing"
fi
deactivate

pm2 delete summarizer-backend 2>/dev/null || true
pm2 start \
  --name summarizer-backend \
  --interpreter "$APP_DIR/summarizer-backend/.venv/bin/python" \
  -- -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2

pm2 delete summarizer-celery 2>/dev/null || true
pm2 start \
  --name summarizer-celery \
  --interpreter "$APP_DIR/summarizer-backend/.venv/bin/python" \
  -- -m celery -A app.tasks.worker worker --loglevel=info --concurrency=2 \
  2>/dev/null || warn "Celery worker not started (may not exist on this branch)"

success "summarizer-backend running"

# =============================================================================
# STEP 9 — llm-tutor-backend  (port 8002)
# =============================================================================
step "llm-tutor-backend (port 8002)"

cd "$APP_DIR/llm-tutor-backend"
"$PYTHON_BIN" -m venv .venv --upgrade-deps
source .venv/bin/activate
pip install --upgrade pip wheel -q
pip install -r requirements.txt -q
python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True)" 2>/dev/null || true
mkdir -p data/chroma data/pdfs
deactivate

pm2 delete llm-tutor-backend 2>/dev/null || true
pm2 start \
  --name llm-tutor-backend \
  --interpreter "$APP_DIR/llm-tutor-backend/.venv/bin/python" \
  -- -m uvicorn main:app --host 0.0.0.0 --port 8002 --workers 2

success "llm-tutor-backend running"

# =============================================================================
# STEP 10 — adaptive-reminder-backend  (port 8001)
# =============================================================================
step "adaptive-reminder-backend (port 8001)"

cd "$APP_DIR/adaptive-reminder-system/backend"
"$PYTHON_BIN" -m venv .venv --upgrade-deps
source .venv/bin/activate
pip install --upgrade pip wheel -q
pip install -r requirements.txt -q
deactivate

if [ -f "app/main.py" ]; then
  ENTRYPOINT="app.main:app"
elif [ -f "main.py" ]; then
  ENTRYPOINT="main:app"
else
  warn "Cannot detect entrypoint — skipping adaptive-reminder-backend"
  ENTRYPOINT=""
fi

if [[ -n "${ENTRYPOINT:-}" ]]; then
  pm2 delete adaptive-reminder-backend 2>/dev/null || true
  pm2 start \
    --name adaptive-reminder-backend \
    --interpreter "$APP_DIR/adaptive-reminder-system/backend/.venv/bin/python" \
    -- -m uvicorn "$ENTRYPOINT" --host 0.0.0.0 --port 8001 --workers 2
  success "adaptive-reminder-backend running"
fi

# =============================================================================
# STEP 11 — Next.js Frontend  (port 3000)
# =============================================================================
step "Next.js Frontend (port 3000)"

cd "$APP_DIR/Frontend"
npm ci 2>/dev/null || npm install

info "Building production bundle (this may take a few minutes)..."
npm run build

pm2 delete frontend 2>/dev/null || true
pm2 start npm --name frontend -- start -- -p 3000
success "Frontend running"

# =============================================================================
# STEP 12 — PM2 persistence across reboots
# =============================================================================
step "PM2 startup on boot"

pm2 save
STARTUP_CMD=$(pm2 startup 2>/dev/null | grep "sudo env" || true)
if [[ -n "$STARTUP_CMD" ]]; then
  eval "$STARTUP_CMD" || warn "PM2 startup hook failed — run: pm2 startup"
else
  sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null || \
    warn "PM2 startup configuration skipped"
fi
success "PM2 configured to start on boot"

# =============================================================================
# STEP 13 — Final health check
# =============================================================================
step "Health Check"
sleep 6

check_svc() {
  local label="$1"; local url="$2"
  if curl -sf --max-time 6 "$url" &>/dev/null; then
    echo -e "  ${GREEN}✔${NC}  $label → $url"
  else
    echo -e "  ${YELLOW}⚠${NC}  $label → $url  (still starting — check: pm2 logs)"
  fi
}

echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  AuraLearn Deployment Complete!${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
check_svc "Frontend (Next.js)  " "http://$VM_IP:3000"
check_svc "Summarizer Backend  " "http://$VM_IP:8000/health"
check_svc "Reminder Backend    " "http://$VM_IP:8001/health"
check_svc "LLM Tutor Backend   " "http://$VM_IP:8002/health"
check_svc "Qdrant Vector DB    " "http://$VM_IP:6333/healthz"
check_svc "MinIO Console       " "http://$VM_IP:9001"
echo ""
echo -e "${BOLD}PM2 Status:${NC}"
pm2 list
echo ""
echo -e "${BOLD}Handy commands:${NC}"
echo -e "  ${CYAN}pm2 logs${NC}                           — all service logs"
echo -e "  ${CYAN}pm2 logs summarizer-backend${NC}        — summarizer logs"
echo -e "  ${CYAN}pm2 logs llm-tutor-backend${NC}         — tutor logs"
echo -e "  ${CYAN}pm2 logs adaptive-reminder-backend${NC} — reminder logs"
echo -e "  ${CYAN}pm2 logs frontend${NC}                  — frontend logs"
echo -e "  ${CYAN}pm2 restart all${NC}                    — restart everything"
echo -e "  ${CYAN}sudo docker compose ps${NC}             — infra containers"
echo -e "  ${CYAN}sudo docker compose logs postgres${NC}  — DB logs"
echo -e "${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo ""
success "Visit your app: http://$VM_IP:3000"

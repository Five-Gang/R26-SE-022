# 🚀 AuraLearn Research — Full DevOps Implementation Plan (A → Z)

> **Project:** RP-AI Summarizer Research (`R26-SE-022`)  
> **Repo:** `https://github.com/Five-Gang/R26-SE-022.git`  
> **Branch:** `Common-integration-all-components`  
> **Production VM:** Oracle Cloud · `opc@129.146.71.78` · Oracle Linux 9.8 · 10 GB RAM · 30 GB Disk  
> **Infra Goal:** Jenkins CI/CD (separate build node) · Prometheus + Grafana · ELK Stack

---

## 📋 Table of Contents

1. [Current Production Architecture](#1-current-production-architecture)
2. [Target DevOps Architecture](#2-target-devops-architecture)
3. [Phase A — New Server Prerequisites](#phase-a--new-server-prerequisites)
4. [Phase B — Jenkins Master Setup](#phase-b--jenkins-master-setup)
5. [Phase C — Jenkins Build Agent Node](#phase-c--jenkins-build-agent-node)
6. [Phase D — Jenkinsfile Pipeline](#phase-d--jenkinsfile-pipeline)
7. [Phase E — Docker Registry](#phase-e--docker-registry)
8. [Phase F — Prometheus Setup](#phase-f--prometheus-setup)
9. [Phase G — Grafana Setup](#phase-g--grafana-setup)
10. [Phase H — ELK Stack Setup](#phase-h--elk-stack-setup)
11. [Phase I — Application Instrumentation](#phase-i--application-instrumentation)
12. [Phase J — Node Exporter on Production VM](#phase-j--node-exporter-on-production-vm)
13. [Phase K — Monitoring docker-compose.yml](#phase-k--monitoring-docker-composeyml)
14. [Phase L — Security & Secrets Hardening](#phase-l--security--secrets-hardening)
15. [A-Z Checklist](#az-implementation-checklist)
16. [Troubleshooting](#troubleshooting-quick-reference)

---


## 1. Current Production Architecture

> [!NOTE]
> This is the **verified live state** of `opc@129.146.71.78` as of 2026-10-06.

```
Oracle Cloud VM  (129.146.71.78 · Oracle Linux 9.8 · 10GB RAM · 30GB disk)
│
├── 🐳 Docker Compose  (infra layer — ~/R26-SE-022/docker-compose.yml)
│   ├── loa-ess-postgres  :5432  ✅ healthy  (4 weeks uptime)
│   ├── loa-ess-redis     :6379  ✅ healthy  (4 weeks uptime)
│   ├── loa-ess-minio     :9000  ✅ healthy  (4 weeks uptime)
│   └── loa-ess-qdrant    :6333  ✅ healthy  (restarted, fixed healthcheck)
│
└── ⚡ PM2  (app layer — uvicorn processes)
    ├── summarizer-backend        :8000  ✅ online  (FastAPI + Alembic)
    ├── adaptive-reminder-backend :8001  ✅ online  (FastAPI + MongoDB)
    ├── llm-tutor-backend         :8002  ✅ online  (FastAPI + ChromaDB)
    ├── emotion-backend           :8004  ✅ online  (FastAPI)
    └── frontend                  :3000  ✅ online  (Next.js prod build)
```

**Firewall open ports (firewall-cmd):**  
`80 443 3000 5432 6333 6334 6379 8000 8001 8002 8004 9000 9001`

---

## 2. Target DevOps Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Developer pushes to github.com/Five-Gang/R26-SE-022                 │
│  Branch: Common-integration-all-components                           │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ GitHub Webhook
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  JENKINS MASTER  (new server — Ubuntu 22.04)                         │
│  Port 8080  ·  Orchestrates pipeline  ·  Stores credentials          │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ SSH  (label: build docker python nodejs)
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  JENKINS BUILD AGENT  (new server — Ubuntu 22.04)                    │
│  Docker · Python 3.11 · Node 20 · pytest · flake8 · Trivy            │
└──────────┬─────────────────────────────┬─────────────────────────────┘
           │ docker push                  │ SSH deploy
           ▼                             ▼
     GHCR / Registry          PRODUCTION VM  (129.146.71.78)
                               opc user · ~/R26-SE-022
                               bash deploy.sh  →  PM2 + Docker Compose

┌──────────────────────────────────────────────────────────────────────┐
│  MONITORING SERVER  (new server — Ubuntu 22.04)                      │
│  Prometheus :9090 · Grafana :3000 · Alertmanager :9093               │
│  Elasticsearch :9200 · Kibana :5601 · Logstash :5044                 │
└──────────────────────────────────────────────────────────────────────┘
           ▲                             ▲
           │ scrape /metrics             │ Filebeat ships logs
           └─────────────────────────────┘
                  Production VM (129.146.71.78)
```

---

## Phase A — New Server Prerequisites

### A.1 — Minimum Server Specs

| Role | CPU | RAM | Disk | OS |
|---|---|---|---|---|
| Jenkins Master | 2 vCPU | 4 GB | 40 GB | **Ubuntu 22.04 LTS** |
| Jenkins Build Agent | 4 vCPU | 8 GB | 80 GB | **Ubuntu 22.04 LTS** |
| Monitoring (Prometheus + ELK) | 4 vCPU | 16 GB | 120 GB | **Ubuntu 22.04 LTS** |

> [!IMPORTANT]
> Jenkins Master and Build Agent use **Ubuntu 22.04** for easy package management.  
> The **Production VM** is Oracle Linux 9.8 — do not change its OS.  
> ELK needs 16 GB RAM minimum. If budget is tight, run Prometheus+Grafana on one server and ELK on another.

### A.2 — Base Setup (Jenkins Master + Build Agent)

```bash
# Run on BOTH Jenkins servers (Ubuntu 22.04)
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  curl wget git unzip jq \
  ca-certificates gnupg lsb-release \
  apt-transport-https software-properties-common

# Docker Engine
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER
newgrp docker
sudo apt install -y docker-compose-plugin
docker compose version   # Docker Compose version v2.x.x

# Java 17 (Jenkins requirement)
sudo apt install -y openjdk-17-jdk
java -version            # openjdk 17.x.x
```

### A.3 — Base Setup (Monitoring Server — Ubuntu 22.04)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip jq

# Docker Engine
curl -fsSL https://get.docker.com | bash
sudo usermod -aG docker $USER && newgrp docker
sudo apt install -y docker-compose-plugin

# CRITICAL for Elasticsearch
sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

### A.4 — Firewall Rules

```bash
# === Jenkins Master (Ubuntu — UFW) ===
sudo ufw allow 22        # SSH
sudo ufw allow 8080      # Jenkins UI
sudo ufw allow 50000     # Agent JNLP
sudo ufw enable

# === Monitoring Server (Ubuntu — UFW) ===
sudo ufw allow 22
sudo ufw allow 9090      # Prometheus
sudo ufw allow 3000      # Grafana
sudo ufw allow 9093      # Alertmanager
sudo ufw allow 9200      # Elasticsearch
sudo ufw allow 5601      # Kibana
sudo ufw allow 5044      # Logstash Beats
sudo ufw allow 9100      # Node Exporter (self)
sudo ufw enable

# === Production VM (Oracle Linux — firewall-cmd) ===
# Already open: 3000 8000 8001 8002 8004 5432 6333 6379 9000 9001
# Add Node Exporter port:
sudo firewall-cmd --zone=public --add-port=9100/tcp --permanent
sudo firewall-cmd --reload
```

---

## Phase B — Jenkins Master Setup

### B.1 — Install Jenkins (Ubuntu 22.04)

```bash
# On Jenkins Master
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key \
  | sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null

echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" \
  | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt update && sudo apt install -y jenkins
sudo systemctl enable --now jenkins
sudo systemctl status jenkins   # ✅ active (running)
```

### B.2 — Unlock Jenkins

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

1. Open `http://<JENKINS_MASTER_IP>:8080`
2. Paste the password
3. **Install suggested plugins**
4. Create admin user

### B.3 — Required Plugins

**Manage Jenkins → Plugins → Available plugins:**

| Plugin ID | Purpose |
|---|---|
| `pipeline` | Declarative pipeline |
| `git` | Git SCM |
| `github` | GitHub webhook trigger |
| `docker-workflow` | Build/push Docker images |
| `ssh-slaves` | SSH Build Agents |
| `credentials-binding` | Inject secrets as env vars |
| `blueocean` | Modern pipeline UI |
| `prometheus` | Expose Jenkins `/prometheus` metrics |
| `email-ext` | Email notifications |
| `ws-cleanup` | Workspace cleanup |
| `junit` | Test result publishing |
| `warnings-ng` | Code quality reports |

### B.4 — Jenkins Credentials Store

**Manage Jenkins → Credentials → System → Global → Add Credential:**

| Credential ID | Kind | Value |
|---|---|---|
| `github-pat` | Username + Password | GitHub username + Personal Access Token |
| `docker-registry-creds` | Username + Password | GHCR login (username + PAT) |
| `opc-ssh-key` | SSH Username with private key | SSH private key for `opc@129.146.71.78` |
| `secrets-env-file` | Secret file | Upload your `secrets.env` file |
| `google-api-key` | Secret text | `GOOGLE_API_KEY` value |
| `gemini-api-key` | Secret text | `GEMINI_API_KEY` value |
| `openai-api-key` | Secret text | `OPENAI_API_KEY` value |
| `mongodb-url` | Secret text | `MONGODB_URL` value |
| `jwt-secret` | Secret text | `JWT_SECRET` value |
| `vm-ip` | Secret text | `129.146.71.78` |

> [!CAUTION]
> **NEVER put any value from `secrets.env` directly in Jenkinsfile.** Always reference credential IDs.

---

## Phase C — Jenkins Build Agent Node

### C.1 — Prepare Build Agent Server (Ubuntu 22.04)

```bash
# On Build Agent server
sudo useradd -m -s /bin/bash jenkins
sudo mkdir -p /home/jenkins/.ssh
sudo chown -R jenkins:jenkins /home/jenkins/.ssh
sudo usermod -aG docker jenkins

sudo mkdir -p /opt/jenkins-agent
sudo chown jenkins:jenkins /opt/jenkins-agent
```

### C.2 — SSH Key Authentication

```bash
# On Jenkins MASTER — generate key pair
ssh-keygen -t ed25519 -C "jenkins-build-agent" -f ~/.ssh/jenkins_agent_key
# No passphrase

# Copy public key to BUILD AGENT
cat ~/.ssh/jenkins_agent_key.pub
```

```bash
# On BUILD AGENT — authorize the key
sudo -u jenkins bash -c "echo '<PASTE_PUBLIC_KEY>' >> /home/jenkins/.ssh/authorized_keys"
sudo chmod 600 /home/jenkins/.ssh/authorized_keys
sudo chmod 700 /home/jenkins/.ssh
```

### C.3 — Register Node in Jenkins UI

1. **Manage Jenkins → Nodes → New Node**
2. Name: `build-agent-01` → **Permanent Agent**
3. Settings:
   - **Executors:** `2`
   - **Remote root:** `/opt/jenkins-agent`
   - **Labels:** `build docker python nodejs`
   - **Launch:** `Launch agents via SSH`
   - **Host:** `<BUILD_AGENT_IP>`
   - **Credentials:** Add → SSH Username with private key → paste private key from `jenkins_agent_key`
   - **Host Key Verification:** `Manually trusted key Verification Strategy`
4. **Save → Launch agent** — verify it shows **Connected**

### C.4 — Install Tools on Build Agent

```bash
# SSH into build agent as the jenkins user
sudo -u jenkins bash

# Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip
python3.11 --version

# Node.js 20 LTS (via NVM — same as production VM)
export NVM_DIR="/home/jenkins/.nvm"
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source "$NVM_DIR/nvm.sh"
nvm install 20 && nvm alias default 20
node --version && npm --version

# Python testing tools
pip3 install pytest flake8 pylint bandit safety pytest-cov

# Trivy — container vulnerability scanner
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh \
  | sh -s -- -b /usr/local/bin
trivy --version
```

---

## Phase D — Jenkinsfile Pipeline

> [!IMPORTANT]
> This Jenkinsfile is accurate for the **actual production architecture**:  
> - Apps run via **PM2** (not Docker containers)  
> - Infra runs via **Docker Compose**  
> - Deploy = SSH to `opc@129.146.71.78` and run `bash deploy.sh`  
> - No Celery worker (module `app.tasks.worker` does not exist on current branch)

Save as `R26-SE-022/Jenkinsfile`:

```groovy
pipeline {
    agent none  // All stages use build agent explicitly

    environment {
        // GitHub repo
        GIT_REPO    = "https://github.com/Five-Gang/R26-SE-022.git"
        GIT_BRANCH  = "Common-integration-all-components"

        // Docker image registry (GHCR)
        REGISTRY       = "ghcr.io/five-gang"
        IMAGE_SUMMARIZER = "${REGISTRY}/auralearn-summarizer"
        IMAGE_FRONTEND   = "${REGISTRY}/auralearn-frontend"

        // Production VM
        VM_USER = "opc"
        VM_IP   = credentials('vm-ip')   // 129.146.71.78
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        skipStagesAfterUnstable()
    }

    triggers {
        githubPush()
    }

    stages {

        // ─────────────────────────────────────────────────────────────
        // STAGE 1 — Checkout
        // ─────────────────────────────────────────────────────────────
        stage('Checkout') {
            agent { label 'build docker python nodejs' }
            steps {
                cleanWs()
                git branch: "${GIT_BRANCH}",
                    credentialsId: 'github-pat',
                    url: "${GIT_REPO}"
                sh 'git log --oneline -5'
                sh 'echo "Build #${BUILD_NUMBER} on branch ${GIT_BRANCH}"'
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STAGE 2 — Lint (parallel)
        // ─────────────────────────────────────────────────────────────
        stage('Lint') {
            parallel {

                stage('Lint: summarizer-backend') {
                    agent { label 'build docker python nodejs' }
                    steps {
                        dir('summarizer-backend') {
                            sh '''
                                python3.11 -m venv .venv
                                . .venv/bin/activate
                                pip install -r requirements.txt -q
                                flake8 app/ --max-line-length=120 --statistics --count
                                pylint app/ --fail-under=6.0 --output-format=colorized || true
                            '''
                        }
                    }
                }

                stage('Lint: llm-tutor-backend') {
                    agent { label 'build docker python nodejs' }
                    steps {
                        dir('llm-tutor-backend') {
                            sh '''
                                python3.11 -m venv .venv
                                . .venv/bin/activate
                                pip install -r requirements.txt -q
                                flake8 . --max-line-length=120 --statistics --count \
                                    --exclude=.venv,data
                            '''
                        }
                    }
                }

                stage('Lint: adaptive-reminder-system') {
                    agent { label 'build docker python nodejs' }
                    steps {
                        dir('adaptive-reminder-system/backend') {
                            sh '''
                                python3.11 -m venv .venv
                                . .venv/bin/activate
                                pip install -r requirements.txt -q
                                flake8 . --max-line-length=120 --statistics \
                                    --exclude=.venv || true
                            '''
                        }
                    }
                }

                stage('Lint: Frontend') {
                    agent { label 'build docker python nodejs' }
                    steps {
                        dir('Frontend') {
                            sh '''
                                npm ci --prefer-offline
                                npm run lint || true
                            '''
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STAGE 3 — Tests + Security (parallel)
        // ─────────────────────────────────────────────────────────────
        stage('Test') {
            parallel {

                stage('Test: summarizer-backend') {
                    agent { label 'build docker python nodejs' }
                    steps {
                        dir('summarizer-backend') {
                            sh '''
                                . .venv/bin/activate
                                mkdir -p test-results
                                pytest tests/ -v \
                                    --junitxml=test-results/junit.xml \
                                    --cov=app \
                                    --cov-report=xml:test-results/coverage.xml \
                                    --tb=short || true
                            '''
                        }
                    }
                    post {
                        always {
                            junit allowEmptyResults: true,
                                  testResults: 'summarizer-backend/test-results/junit.xml'
                        }
                    }
                }

                stage('Security: bandit + safety') {
                    agent { label 'build docker python nodejs' }
                    steps {
                        dir('summarizer-backend') {
                            sh '''
                                . .venv/bin/activate
                                mkdir -p test-results
                                bandit -r app/ -f json \
                                    -o test-results/bandit.json || true
                                safety check -r requirements.txt \
                                    --output text || true
                            '''
                        }
                    }
                    post {
                        always {
                            archiveArtifacts allowEmptyArchive: true,
                                artifacts: 'summarizer-backend/test-results/bandit.json'
                        }
                    }
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STAGE 4 — Docker Build & Push
        // (Only on main integration branch or PRs)
        // ─────────────────────────────────────────────────────────────
        stage('Docker Build & Push') {
            agent { label 'build docker python nodejs' }
            when {
                anyOf {
                    branch 'Common-integration-all-components'
                    branch 'main'
                    changeRequest()
                }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login ghcr.io -u "$DOCKER_USER" --password-stdin'
                }

                // summarizer-backend (has Dockerfile)
                sh """
                    docker buildx build \
                        --platform linux/amd64 \
                        --tag ${IMAGE_SUMMARIZER}:${BUILD_NUMBER} \
                        --tag ${IMAGE_SUMMARIZER}:latest \
                        --push \
                        ./summarizer-backend
                """

                // Frontend (has Dockerfile)
                sh """
                    docker buildx build \
                        --platform linux/amd64 \
                        --tag ${IMAGE_FRONTEND}:${BUILD_NUMBER} \
                        --tag ${IMAGE_FRONTEND}:latest \
                        --push \
                        ./Frontend
                """
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STAGE 5 — Container Vulnerability Scan
        // ─────────────────────────────────────────────────────────────
        stage('Trivy Scan') {
            agent { label 'build docker python nodejs' }
            when {
                anyOf {
                    branch 'Common-integration-all-components'
                    branch 'main'
                }
            }
            steps {
                sh """
                    trivy image \
                        --exit-code 0 \
                        --severity HIGH,CRITICAL \
                        --format json \
                        --output trivy-summarizer.json \
                        ${IMAGE_SUMMARIZER}:${BUILD_NUMBER}
                """
                archiveArtifacts artifacts: 'trivy-*.json', allowEmptyArchive: true
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STAGE 6 — Deploy to Production VM
        // Triggers deploy.sh on the Oracle Cloud VM via SSH
        // Apps restart via PM2, infra via docker compose
        // ─────────────────────────────────────────────────────────────
        stage('Deploy to Production') {
            agent { label 'build docker python nodejs' }
            when {
                branch 'Common-integration-all-components'
            }
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'opc-ssh-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    ),
                    file(
                        credentialsId: 'secrets-env-file',
                        variable: 'SECRETS_FILE'
                    )
                ]) {
                    sh """
                        # Push updated secrets.env to VM home dir
                        scp -i \$SSH_KEY \
                            -o StrictHostKeyChecking=no \
                            -o ConnectTimeout=30 \
                            \$SECRETS_FILE \
                            opc@${VM_IP}:/home/opc/secrets.env

                        # Run deploy.sh on the VM
                        # deploy.sh: pulls latest git, writes .env files,
                        # restarts docker compose infra, restarts PM2 apps
                        ssh -i \$SSH_KEY \
                            -o StrictHostKeyChecking=no \
                            -o ConnectTimeout=30 \
                            opc@${VM_IP} '
                                cd ~/R26-SE-022 || exit 1
                                git fetch origin
                                git checkout Common-integration-all-components
                                git pull origin Common-integration-all-components
                                bash ~/R26-SE-022/deploy.sh
                            '
                    """
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STAGE 7 — Post-deploy Health Check
        // ─────────────────────────────────────────────────────────────
        stage('Health Check') {
            agent { label 'build docker python nodejs' }
            when {
                branch 'Common-integration-all-components'
            }
            steps {
                sh """
                    echo "Waiting 20s for services to stabilize..."
                    sleep 20

                    echo "--- Health Checks ---"
                    curl -sf --max-time 10 http://${VM_IP}:8000/health \
                        && echo "✅ summarizer-backend :8000 OK" \
                        || echo "⚠️  summarizer-backend :8000 not responding"

                    curl -sf --max-time 10 http://${VM_IP}:8002/health \
                        && echo "✅ llm-tutor-backend :8002 OK" \
                        || echo "⚠️  llm-tutor-backend :8002 not responding"

                    curl -sf --max-time 10 http://${VM_IP}:6333/healthz \
                        && echo "✅ qdrant :6333 OK" \
                        || echo "⚠️  qdrant :6333 not responding"

                    curl -sf --max-time 10 -o /dev/null http://${VM_IP}:3000 \
                        && echo "✅ frontend :3000 OK" \
                        || echo "⚠️  frontend :3000 not responding"
                """
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline SUCCESS — Build #${BUILD_NUMBER} deployed to ${VM_IP}"
        }
        failure {
            echo "❌ Pipeline FAILED — Build #${BUILD_NUMBER} — check stage logs above"
        }
        always {
            cleanWs()
        }
    }
}
```

---

## Phase E — Docker Registry

### Option 1: GitHub Container Registry (GHCR) — Recommended

```bash
# Create GitHub PAT with scopes: write:packages, read:packages, delete:packages
# Add to Jenkins as credential ID: docker-registry-creds

# Test from build agent:
echo $GITHUB_PAT | docker login ghcr.io -u five-gang --password-stdin
```

### Option 2: Local Registry on Build Agent

```bash
docker run -d \
  --name local-registry \
  --restart=always \
  -p 5000:5000 \
  -v /opt/registry-data:/var/lib/registry \
  registry:2

# Update Jenkinsfile REGISTRY = "<BUILD_AGENT_IP>:5000"
```

---

## Phase F — Prometheus Setup

### F.1 — Directory Structure on Monitoring Server

```bash
mkdir -p /opt/monitoring/prometheus/rules
mkdir -p /opt/monitoring/alertmanager
mkdir -p /opt/monitoring/grafana/provisioning/datasources
mkdir -p /opt/monitoring/grafana/provisioning/dashboards
mkdir -p /opt/monitoring/grafana/dashboards
mkdir -p /opt/monitoring/logstash/pipeline
```

### F.2 — prometheus.yml

```yaml
# /opt/monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    env: 'research'
    project: 'auralearn'
    repo: 'R26-SE-022'

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:

  # Prometheus self
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Jenkins master
  - job_name: 'jenkins'
    metrics_path: '/prometheus'
    static_configs:
      - targets: ['<JENKINS_MASTER_IP>:8080']
    basic_auth:
      username: 'admin'
      password: '<JENKINS_API_TOKEN>'

  # Node Exporter — all servers
  - job_name: 'node-exporter'
    static_configs:
      - targets:
          - '129.146.71.78:9100'         # Production VM (Oracle Linux)
          - '<JENKINS_MASTER_IP>:9100'   # Jenkins Master
          - '<BUILD_AGENT_IP>:9100'      # Jenkins Build Agent
          - '<MONITORING_IP>:9100'       # Monitoring server (self)
        labels:
          env: 'research'

  # cAdvisor — container metrics on production VM
  - job_name: 'cadvisor'
    static_configs:
      - targets: ['129.146.71.78:8081']

  # FastAPI — summarizer-backend (port 8000)
  - job_name: 'summarizer-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['129.146.71.78:8000']

  # FastAPI — adaptive-reminder-backend (port 8001)
  - job_name: 'adaptive-reminder-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['129.146.71.78:8001']

  # FastAPI — llm-tutor-backend (port 8002)
  - job_name: 'llm-tutor-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['129.146.71.78:8002']

  # FastAPI — emotion-backend (port 8004)
  - job_name: 'emotion-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['129.146.71.78:8004']

  # PostgreSQL exporter (port 9187 — install separately)
  - job_name: 'postgres'
    static_configs:
      - targets: ['129.146.71.78:9187']

  # Redis exporter (port 9121 — install separately)
  - job_name: 'redis'
    static_configs:
      - targets: ['129.146.71.78:9121']

  # Qdrant native metrics
  - job_name: 'qdrant'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['129.146.71.78:6333']

  # Elasticsearch exporter
  - job_name: 'elasticsearch'
    static_configs:
      - targets: ['<MONITORING_IP>:9114']
```

### F.3 — Alert Rules

```yaml
# /opt/monitoring/prometheus/rules/alerts.yml
groups:
  - name: auralearn.research
    interval: 1m
    rules:

      # Any scrape target is down
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.job }} is DOWN"
          description: "Instance {{ $labels.instance }} has been unreachable for 2 minutes."

      # High CPU usage
      - alert: HighCPU
        expr: >
          100 - (avg by(instance)(
            irate(node_cpu_seconds_total{mode="idle"}[5m])
          ) * 100) > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU on {{ $labels.instance }} ({{ $value | printf \"%.1f\" }}%)"

      # Low available memory
      - alert: LowMemory
        expr: >
          (node_memory_MemAvailable_bytes
           / node_memory_MemTotal_bytes) * 100 < 15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low memory on {{ $labels.instance }} ({{ $value | printf \"%.1f\" }}% free)"

      # Disk almost full (< 20% free)
      - alert: DiskAlmostFull
        expr: >
          (node_filesystem_avail_bytes{mountpoint="/", fstype!="tmpfs"}
           / node_filesystem_size_bytes{mountpoint="/", fstype!="tmpfs"}) * 100 < 20
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Disk < 20% free on {{ $labels.instance }}"

      # Disk critical (< 10% free) — VM currently at 63%, warn early
      - alert: DiskCritical
        expr: >
          (node_filesystem_avail_bytes{mountpoint="/", fstype!="tmpfs"}
           / node_filesystem_size_bytes{mountpoint="/", fstype!="tmpfs"}) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CRITICAL: Disk < 10% on {{ $labels.instance }}"

      # API high P95 latency
      - alert: APIHighLatency
        expr: >
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 latency > 3s on {{ $labels.job }}"

      # PM2 process restart rate — detect crash loops
      - alert: HighRestartRate
        expr: increase(pm2_restart_count_total[10m]) > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "PM2 process restarting rapidly on {{ $labels.instance }}"
```

---

## Phase G — Grafana Setup

### G.1 — Datasource Provisioning

```yaml
# /opt/monitoring/grafana/provisioning/datasources/datasources.yml
apiVersion: 1
datasources:

  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: Elasticsearch
    type: elasticsearch
    access: proxy
    url: http://elasticsearch:9200
    database: "auralearn-logs-*"
    jsonData:
      timeField: "@timestamp"
      esVersion: "8.0.0"
      logMessageField: log_message
      logLevelField: level
    editable: false
```

### G.2 — Dashboard Provisioning

```yaml
# /opt/monitoring/grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: 'AuraLearn Research'
    orgId: 1
    folder: 'AuraLearn'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    options:
      path: /var/lib/grafana/dashboards
```

### G.3 — Import Community Dashboards

**Grafana → Dashboards → New → Import → Enter ID:**

| Grafana ID | Dashboard | Use For |
|---|---|---|
| `1860` | Node Exporter Full | CPU, RAM, Disk, Network on all servers |
| `893` | Docker & System Monitoring | cAdvisor container metrics |
| `9964` | Jenkins Performance & Health | Build durations, queue |
| `9628` | PostgreSQL Database | `loa-ess-postgres` query stats |
| `763` | Redis Dashboard | `loa-ess-redis` hit rate, memory |
| `17175` | FastAPI Observability | Request rate, latency per endpoint |
| `14191` | Elasticsearch Monitoring | ELK cluster health |
| `12708` | PM2 Monitoring | PM2 process metrics |

---

## Phase H — ELK Stack Setup

### H.1 — Logstash Pipeline

```ruby
# /opt/monitoring/logstash/pipeline/auralearn.conf

input {
  beats {
    port => 5044
    type => "filebeat"
  }
}

filter {
  # Parse JSON structured logs from FastAPI backends
  json {
    source => "message"
    target => "parsed"
    skip_on_invalid_json => true
  }

  mutate {
    rename => {
      "[parsed][level]"       => "level"
      "[parsed][message]"     => "log_message"
      "[parsed][service]"     => "service"
      "[parsed][request_id]"  => "request_id"
      "[parsed][duration_ms]" => "duration_ms"
      "[parsed][status_code]" => "status_code"
      "[parsed][http_path]"   => "http_path"
      "[parsed][http_method]" => "http_method"
      "[parsed][module]"      => "module"
      "[parsed][timestamp]"   => "app_timestamp"
    }
  }

  # Tag slow requests (>1000ms)
  if [duration_ms] and [duration_ms] > 1000 {
    mutate { add_tag => ["slow_request"] }
  }

  # Tag HTTP errors (4xx/5xx)
  if [status_code] and [status_code] >= 400 {
    mutate { add_tag => ["http_error"] }
  }

  # Tag errors by log level
  if [level] == "ERROR" or [level] == "CRITICAL" {
    mutate { add_tag => ["app_error"] }
  }

  # Parse app timestamp if present
  if [app_timestamp] {
    date {
      match => ["app_timestamp", "ISO8601"]
      target => "@timestamp"
    }
  }

  # Add service tag from Docker container name
  if [container][name] {
    mutate {
      add_field => { "container_name" => "%{[container][name]}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "auralearn-logs-%{+YYYY.MM.dd}"
    document_type => "_doc"
  }
  # Uncomment to debug:
  # stdout { codec => rubydebug }
}
```

### H.2 — Filebeat Config on Production VM

> [!IMPORTANT]
> The Production VM is **Oracle Linux 9.8**. Use the **RPM installation method**, not apt.

```bash
# Install Filebeat on Oracle Linux VM (opc@129.146.71.78)
sudo rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch

sudo tee /etc/yum.repos.d/elastic.repo > /dev/null <<'EOF'
[elastic-8.x]
name=Elastic repository for 8.x packages
baseurl=https://artifacts.elastic.co/packages/8.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md
EOF

sudo dnf install -y filebeat
```

```yaml
# /etc/filebeat/filebeat.yml  (on Oracle Linux production VM)
filebeat.inputs:

  # Docker container logs (infra: postgres, redis, minio, qdrant)
  - type: container
    paths:
      - '/var/lib/docker/containers/*/*.log'
    stream: all
    processors:
      - add_docker_metadata:
          host: "unix:///var/run/docker.sock"
    fields:
      source: docker
      project: auralearn
    fields_under_root: true

  # PM2 logs — summarizer-backend
  - type: log
    enabled: true
    paths:
      - /home/opc/.pm2/logs/summarizer-backend-out.log
      - /home/opc/.pm2/logs/summarizer-backend-error.log
    fields:
      service: summarizer-backend
      source: pm2
      project: auralearn
      env: production
    fields_under_root: true
    json.keys_under_root: true
    json.add_error_key: true
    json.ignore_decoding_error: true

  # PM2 logs — llm-tutor-backend
  - type: log
    enabled: true
    paths:
      - /home/opc/.pm2/logs/llm-tutor-backend-out.log
      - /home/opc/.pm2/logs/llm-tutor-backend-error.log
    fields:
      service: llm-tutor-backend
      source: pm2
      project: auralearn
      env: production
    fields_under_root: true
    json.keys_under_root: true
    json.add_error_key: true
    json.ignore_decoding_error: true

  # PM2 logs — adaptive-reminder-backend
  - type: log
    enabled: true
    paths:
      - /home/opc/.pm2/logs/adaptive-reminder-backend-out.log
      - /home/opc/.pm2/logs/adaptive-reminder-backend-error.log
    fields:
      service: adaptive-reminder-backend
      source: pm2
      project: auralearn
    fields_under_root: true

  # PM2 logs — emotion-backend
  - type: log
    enabled: true
    paths:
      - /home/opc/.pm2/logs/emotion-backend-out.log
      - /home/opc/.pm2/logs/emotion-backend-error.log
    fields:
      service: emotion-backend
      source: pm2
      project: auralearn
    fields_under_root: true

processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - drop_fields:
      fields: ["agent.ephemeral_id", "ecs.version"]
      ignore_missing: true

output.logstash:
  hosts: ["<MONITORING_SERVER_IP>:5044"]

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644
```

```bash
# Enable and start Filebeat (Oracle Linux)
sudo systemctl enable filebeat
sudo systemctl start filebeat
sudo systemctl status filebeat   # ✅ active (running)

# Test config
sudo filebeat test config
sudo filebeat test output
```

### H.3 — Kibana Index Pattern & Saved Searches

1. Open `http://<MONITORING_SERVER_IP>:5601`
2. **Stack Management → Index Patterns → Create index pattern**
   - Pattern: `auralearn-logs-*`
   - Time field: `@timestamp`
3. **Discover** — verify logs appear within 1–2 minutes
4. **Create saved searches (Discover → Save):**

| Search Name | KQL Filter |
|---|---|
| Slow API Requests | `tags: slow_request` |
| HTTP Errors (4xx/5xx) | `tags: http_error` |
| Application Errors | `tags: app_error` |
| Summarizer Backend Logs | `service: summarizer-backend` |
| LLM Tutor Logs | `service: llm-tutor-backend` |
| Docker Infra Logs | `source: docker` |

---

## Phase I — Application Instrumentation

### I.1 — Add Prometheus Metrics to FastAPI Backends

```bash
# Add to requirements.txt in each backend:
pip install prometheus-fastapi-instrumentator==6.1.0
```

```python
# summarizer-backend/app/main.py
from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(title="AuraLearn Summarizer API")

# Auto-exposes GET /metrics endpoint for Prometheus scraping
Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=False,
    excluded_handlers=["/health", "/metrics"],
).instrument(app).expose(app, include_in_schema=False)
```

> Apply the same pattern to `llm-tutor-backend/main.py`, `adaptive-reminder-system/backend/`, and `emotion-backend/`.

### I.2 — Structured JSON Logging

```python
# shared across all backends: app/core/logging.py
import logging
import json
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """Formats log records as single-line JSON for ELK ingestion."""

    def __init__(self, service_name: str):
        super().__init__()
        self.service_name = service_name

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level":     record.levelname,
            "service":   self.service_name,
            "message":   record.getMessage(),
            "module":    record.module,
            "funcName":  record.funcName,
            "lineno":    record.lineno,
        }
        # Extra fields injected via logger.info("...", extra={...})
        for field in ["request_id", "duration_ms", "status_code",
                      "http_path", "http_method", "user_id"]:
            if hasattr(record, field):
                log_entry[field] = getattr(record, field)

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry, ensure_ascii=False)


def setup_logging(service_name: str, level: str = "INFO") -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter(service_name))
    logging.basicConfig(
        handlers=[handler],
        level=getattr(logging, level.upper(), logging.INFO),
        force=True,
    )
```

```python
# In main.py — call before app creation:
from app.core.logging import setup_logging
setup_logging("summarizer-backend")
```

### I.3 — Request Logging Middleware

```python
# app/middleware/request_logging.py
import time
import uuid
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        start_time = time.perf_counter()

        # Skip logging for health/metrics endpoints
        if request.url.path in ["/health", "/metrics", "/favicon.ico"]:
            return await call_next(request)

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        logger.info(
            f"{request.method} {request.url.path} {response.status_code}",
            extra={
                "request_id":  request_id,
                "http_method": request.method,
                "http_path":   str(request.url.path),
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            }
        )
        # Return request-id in response header for tracing
        response.headers["X-Request-ID"] = request_id
        return response

# In main.py:
# from app.middleware.request_logging import RequestLoggingMiddleware
# app.add_middleware(RequestLoggingMiddleware)
```

---

## Phase J — Node Exporter on Production VM

> [!IMPORTANT]
> Production VM is **Oracle Linux 9.8** → use `dnf` and `firewall-cmd`.

```bash
# SSH into production VM
ssh -i ~/Downloads/ssh-key-2026-08-31.key opc@129.146.71.78

# Download Node Exporter
NODE_EXP_VER="1.7.0"
wget https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXP_VER}/node_exporter-${NODE_EXP_VER}.linux-amd64.tar.gz
tar xzf node_exporter-${NODE_EXP_VER}.linux-amd64.tar.gz
sudo mv node_exporter-${NODE_EXP_VER}.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter-*

# Create systemd service
sudo tee /etc/systemd/system/node_exporter.service > /dev/null <<'EOF'
[Unit]
Description=Prometheus Node Exporter
After=network.target

[Service]
User=opc
Group=opc
Type=simple
ExecStart=/usr/local/bin/node_exporter \
    --collector.systemd \
    --collector.processes
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter
sudo systemctl status node_exporter   # ✅ active

# Open port (Oracle Linux firewall-cmd)
sudo firewall-cmd --zone=public --add-port=9100/tcp --permanent
sudo firewall-cmd --reload

# Verify
curl http://localhost:9100/metrics | head -5
```

### Also install cAdvisor for Docker container metrics

```bash
# On production VM (Docker container — simplest method)
sudo docker run -d \
  --name cadvisor \
  --restart unless-stopped \
  --volume /:/rootfs:ro \
  --volume /var/run:/var/run:ro \
  --volume /sys:/sys:ro \
  --volume /var/lib/docker:/var/lib/docker:ro \
  --publish 8081:8080 \
  --privileged \
  gcr.io/cadvisor/cadvisor:v0.49.1

# Open port
sudo firewall-cmd --zone=public --add-port=8081/tcp --permanent
sudo firewall-cmd --reload

# Verify
curl http://localhost:8081/metrics | head -5
```

---

## Phase K — Monitoring docker-compose.yml

```yaml
# /opt/monitoring/docker-compose.yml
# Deploy on: Monitoring Server (Ubuntu 22.04, 16GB RAM)
# Run: docker compose up -d

version: '3.8'

services:

  # ── Prometheus ─────────────────────────────────────────
  prometheus:
    image: prom/prometheus:v2.51.0
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - ./prometheus/rules:/etc/prometheus/rules:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

  # ── Alertmanager ───────────────────────────────────────
  alertmanager:
    image: prom/alertmanager:v0.27.0
    container_name: alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'

  # ── Grafana ────────────────────────────────────────────
  grafana:
    image: grafana/grafana:10.4.0
    container_name: grafana
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_USER: admin
      GF_SECURITY_ADMIN_PASSWORD: "${GRAFANA_PASSWORD:-AuraLearn2026!}"
      GF_INSTALL_PLUGINS: "grafana-clock-panel,grafana-piechart-panel"
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
    depends_on:
      - prometheus

  # ── Node Exporter (monitoring server self) ─────────────
  node-exporter:
    image: prom/node-exporter:v1.7.0
    container_name: node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'

  # ── Elasticsearch ──────────────────────────────────────
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.13.0
    container_name: elasticsearch
    restart: unless-stopped
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - xpack.monitoring.collection.enabled=true
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - cluster.name=auralearn-research
      - node.name=es-node-01
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:9200/_cluster/health | grep -qv '\"status\":\"red\"'"]
      interval: 30s
      timeout: 10s
      retries: 5

  # ── Logstash ───────────────────────────────────────────
  logstash:
    image: docker.elastic.co/logstash/logstash:8.13.0
    container_name: logstash
    restart: unless-stopped
    ports:
      - "5044:5044"   # Beats input
      - "9600:9600"   # Logstash monitoring API
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline:ro
    environment:
      LS_JAVA_OPTS: "-Xms1g -Xmx1g"
      MONITORING_ENABLED: "false"
    depends_on:
      elasticsearch:
        condition: service_healthy

  # ── Kibana ─────────────────────────────────────────────
  kibana:
    image: docker.elastic.co/kibana/kibana:8.13.0
    container_name: kibana
    restart: unless-stopped
    ports:
      - "5601:5601"
    environment:
      ELASTICSEARCH_HOSTS: '["http://elasticsearch:9200"]'
      SERVER_NAME: "auralearn-kibana"
    depends_on:
      elasticsearch:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:5601/api/status | grep -q 'available'"]
      interval: 30s
      timeout: 10s
      retries: 10

  # ── Elasticsearch Exporter (for Prometheus) ────────────
  elasticsearch-exporter:
    image: quay.io/prometheuscommunity/elasticsearch-exporter:v1.7.0
    container_name: elasticsearch-exporter
    restart: unless-stopped
    ports:
      - "9114:9114"
    command:
      - '--es.uri=http://elasticsearch:9200'
      - '--es.all'
      - '--es.indices'
    depends_on:
      - elasticsearch

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:
  elasticsearch_data:
```

---

## Phase L — Security & Secrets Hardening

> [!CAUTION]
> The file `secrets.env` at `opc@129.146.71.78:~/R26-SE-022/secrets.env` contains **live production API keys**. Take these steps now:

### L.1 — Rotate All API Keys

```bash
# 1. Google / Gemini API Keys
#    → console.cloud.google.com → APIs & Services → Credentials
#    → Delete old key → Create new key → Update Jenkins credential

# 2. OpenAI API Key
#    → platform.openai.com → API Keys → Revoke old → Create new

# 3. New JWT Secret
python3 -c "import secrets; print(secrets.token_hex(64))"

# 4. New MinIO credentials
python3 -c "import secrets; print('ACCESS:', secrets.token_hex(16)); print('SECRET:', secrets.token_hex(32))"

# 5. New PostgreSQL password
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### L.2 — Verify Git Safety

```bash
# Ensure secrets.env is never committed
cat .gitignore | grep secrets
# Should show: secrets.env

# If not present:
echo "secrets.env" >> .gitignore
git rm --cached secrets.env 2>/dev/null || true
git add .gitignore
git commit -m "chore: ensure secrets.env is gitignored"
```

### L.3 — Production VM Hardening

```bash
# SSH into VM as opc
ssh -i ~/Downloads/ssh-key-2026-08-31.key opc@129.146.71.78

# Set secrets.env permissions to owner-only
chmod 600 ~/secrets.env
chmod 600 ~/R26-SE-022/secrets.env

# Restrict Docker socket access
sudo chmod 660 /var/run/docker.sock
sudo chown root:docker /var/run/docker.sock
```

---

## ✅ A-Z Implementation Checklist

```
PHASE A — SERVER SETUP
[ ] A1   Provision Jenkins Master server (Ubuntu 22.04, 4GB RAM)
[ ] A2   Provision Jenkins Build Agent server (Ubuntu 22.04, 8GB RAM)
[ ] A3   Provision Monitoring server (Ubuntu 22.04, 16GB RAM)
[ ] A4   Install Docker + Docker Compose v2 + Java 17 on Jenkins servers
[ ] A5   Set vm.max_map_count=262144 on Monitoring server (Elasticsearch)
[ ] A6   Configure UFW on new Ubuntu servers
[ ] A7   Open port 9100 on Production VM (firewall-cmd, Oracle Linux)

PHASE B — JENKINS MASTER
[ ] B1   Install Jenkins via apt on Master server
[ ] B2   Unlock Jenkins UI, install suggested plugins
[ ] B3   Install additional plugins: docker-workflow, ssh-slaves,
         prometheus, blueocean, credentials-binding, junit, ws-cleanup
[ ] B4   Add all 9 credentials to Jenkins Credential Store (never in code)

PHASE C — JENKINS BUILD AGENT
[ ] C1   Create 'jenkins' user + /opt/jenkins-agent on Build Agent
[ ] C2   Add jenkins user to docker group on Build Agent
[ ] C3   Generate ed25519 SSH key pair on Jenkins Master
[ ] C4   Authorize public key on Build Agent (~/.ssh/authorized_keys)
[ ] C5   Register 'build-agent-01' node in Jenkins UI
         Label: 'build docker python nodejs'
[ ] C6   Install Python 3.11, Node 20 (via NVM), pytest, flake8,
         bandit, safety, Trivy on Build Agent
[ ] C7   Trigger a test Jenkins job — verify agent picks it up

PHASE D — CI/CD PIPELINE
[ ] D1   Create Jenkinsfile in repo root (R26-SE-022/Jenkinsfile)
[ ] D2   Replace <JENKINS_MASTER_IP>, <BUILD_AGENT_IP> placeholders
[ ] D3   Configure GitHub webhook:
         Payload URL: http://<JENKINS_IP>:8080/github-webhook/
         Content type: application/json
         Events: Push, Pull request
[ ] D4   Push a test commit — verify all 7 stages run:
         Checkout → Lint → Test → Docker Build → Trivy → Deploy → Health Check
[ ] D5   Verify Health Check stage passes for all 4 endpoints

PHASE E — DOCKER REGISTRY
[ ] E1   Create GitHub PAT with write:packages, read:packages
[ ] E2   Add registry credentials to Jenkins (ID: docker-registry-creds)
[ ] E3   Verify docker push to ghcr.io/five-gang/ works from pipeline

PHASE F — PROMETHEUS
[ ] F1   Create /opt/monitoring/ directory structure on Monitoring server
[ ] F2   Write prometheus.yml — replace ALL <IP> placeholders with real IPs
[ ] F3   Write alert rules: rules/alerts.yml
[ ] F4   Install Node Exporter on Production VM (Oracle Linux rpm method)
[ ] F5   Install cAdvisor on Production VM (Docker container, port 8081)
[ ] F6   Open port 9100 and 8081 on Oracle Linux firewall (firewall-cmd)
[ ] F7   Install Node Exporter on Jenkins Master + Build Agent (Ubuntu apt)

PHASE G — GRAFANA
[ ] G1   Write grafana/provisioning/datasources/datasources.yml
[ ] G2   Write grafana/provisioning/dashboards/dashboards.yml
[ ] G3   Import community dashboards: 1860, 893, 9964, 9628, 763, 17175
[ ] G4   Change Grafana admin password from default

PHASE H — ELK STACK
[ ] H1   Write logstash/pipeline/auralearn.conf
[ ] H2   Install Filebeat on Production VM (Oracle Linux — dnf/rpm method)
[ ] H3   Write /etc/filebeat/filebeat.yml on Production VM
         (covers Docker container logs + all 5 PM2 process log files)
[ ] H4   Enable and start Filebeat: systemctl enable --now filebeat
[ ] H5   Deploy monitoring docker-compose.yml on Monitoring server
[ ] H6   Verify Elasticsearch is healthy:
         curl http://localhost:9200/_cluster/health
[ ] H7   Create Kibana index pattern: auralearn-logs-* (timeField: @timestamp)
[ ] H8   Open Kibana Discover — verify logs flowing from all 5 PM2 services
[ ] H9   Create 6 Kibana saved searches (slow_request, http_error, etc.)

PHASE I — APP INSTRUMENTATION
[ ] I1   Add prometheus-fastapi-instrumentator==6.1.0 to each backend's
         requirements.txt (summarizer, llm-tutor, adaptive-reminder, emotion)
[ ] I2   Call Instrumentator().instrument(app).expose(app) in each main.py
[ ] I3   Add JSONFormatter structured logger to each backend (app/core/logging.py)
[ ] I4   Add RequestLoggingMiddleware to each backend
[ ] I5   Verify GET /metrics on :8000, :8001, :8002, :8004 returns Prometheus data
[ ] I6   Redeploy backends via PM2 (pm2 restart all)

PHASE J — NODE EXPORTER ON VM
[ ] J1   Install Node Exporter v1.7.0 as systemd service on VM
[ ] J2   Run cAdvisor as Docker container on port 8081 on VM
[ ] J3   Confirm Prometheus scrapes both:
         curl http://129.146.71.78:9100/metrics
         curl http://129.146.71.78:8081/metrics

PHASE K — MONITORING STACK
[ ] K1   Run: docker compose up -d on Monitoring server
[ ] K2   Verify all 8 containers healthy:
         prometheus, grafana, alertmanager, elasticsearch (healthy),
         logstash, kibana (healthy), node-exporter, elasticsearch-exporter
[ ] K3   Open Prometheus UI → Status → Targets
         All targets must show state=UP
[ ] K4   Open Grafana → import dashboards → verify data flowing

PHASE L — SECURITY
[ ] L1   Rotate Google/Gemini API keys → update Jenkins credential
[ ] L2   Rotate OpenAI API key → update Jenkins credential
[ ] L3   Generate new JWT_SECRET, MinIO creds, Postgres password
[ ] L4   Verify secrets.env is in .gitignore (never committed)
[ ] L5   Set chmod 600 on secrets.env on production VM
[ ] L6   Enable Elasticsearch xpack.security before any public exposure
[ ] L7   Restrict Kibana/Prometheus to private network or add nginx auth
```

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Fix |
|---|---|---|
| Build agent shows **Offline** | SSH key mismatch or wrong IP | Check `chmod 600 authorized_keys` on agent; verify key in Jenkins credentials |
| Docker push fails | Not logged in to GHCR | Verify `docker-registry-creds` in Jenkins; re-login via `docker login ghcr.io` |
| Deploy stage fails | Wrong SSH key or `opc-ssh-key` not set | Upload correct `ssh-key-2026-08-31.key` to Jenkins as SSH credential |
| `deploy.sh` fails on VM | Missing `secrets.env` | Verify SCP step copies secrets.env before deploy.sh runs |
| Prometheus target **DOWN** | Port not open or service not started | `curl http://129.146.71.78:9100/metrics` from monitoring server; check firewall-cmd |
| Elasticsearch won't start | `vm.max_map_count` too low | `sudo sysctl -w vm.max_map_count=262144` on monitoring server |
| Kibana shows "red cluster" | Elasticsearch not ready | `curl http://localhost:9200/_cluster/health` — wait for green/yellow |
| No logs in Kibana | Filebeat not running or wrong output host | `sudo systemctl status filebeat`; check output.logstash host in filebeat.yml |
| `/metrics` returns 404 on backends | Instrumentator not added | Add `Instrumentator().instrument(app).expose(app)` to main.py; restart via PM2 |
| PM2 process restarting | App crash — check logs | `pm2 logs <name> --lines 50` on VM; check for missing env vars or import errors |
| Disk full on VM | `.venv` folders / logs | `du -sh ~/R26-SE-022/*/.venv` — clean pip cache, PM2 logs, `__pycache__` |
| Qdrant shows unhealthy | healthcheck uses `curl` (not in image) | Already fixed — uses bash TCP check `</dev/tcp/localhost/6333` |

---

*Verified against live VM `opc@129.146.71.78` (Oracle Linux 9.8) · 2026-10-06*  
*Repo: `github.com/Five-Gang/R26-SE-022` · Branch: `Common-integration-all-components`*

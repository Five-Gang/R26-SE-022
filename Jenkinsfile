pipeline {
    // Executes on my-agent-node (a separate VM from the Oracle app server)
    // All deployment commands SSH into Oracle VM (opc@129.146.71.78)
    agent {
        label 'my-agent-node'
    }

    environment {
        ORACLE_VM_IP   = '129.146.71.78'
        ORACLE_VM_USER = 'opc'
        APP_DIR        = '/home/opc/R26-SE-022'
        GIT_BRANCH     = 'Common-integration-all-components'
    }

    triggers {
        // Auto-trigger on every GitHub push
        // Webhook → http://<jenkins-master-ip>:8080/github-webhook/
        githubPush()
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }

    stages {

        // ──────────────────────────────────────────────────────
        // STAGE 1: Pull latest code on the Oracle VM
        // ──────────────────────────────────────────────────────
        stage('Pull Latest Code') {
            steps {
                echo "🔄 Pulling branch '${GIT_BRANCH}' on Oracle VM..."

                sshagent(credentials: ['oracle-vm-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${ORACLE_VM_USER}@${ORACLE_VM_IP} '
                            set -e
                            cd ${APP_DIR}
                            git fetch origin
                            git reset --hard origin/${GIT_BRANCH}
                            echo ">>> Latest commit:"
                            git log --oneline -1
                        '
                    """
                }

                echo "✅ Code updated."
            }
        }

        // ──────────────────────────────────────────────────────
        // STAGE 2: Build Frontend (Next.js) on Oracle VM
        // ──────────────────────────────────────────────────────
        stage('Frontend - Install & Build') {
            steps {
                echo "📦 Building Next.js frontend on Oracle VM..."

                sshagent(credentials: ['oracle-vm-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${ORACLE_VM_USER}@${ORACLE_VM_IP} '
                            set -e
                            export NVM_DIR="\$HOME/.nvm"
                            [ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"

                            echo "Node: \$(node -v) | NPM: \$(npm -v)"

                            # Auto-detect Next.js frontend folder
                            FRONTEND_DIR=\$(find ${APP_DIR} -name "next.config*" -maxdepth 3 | head -1 | xargs dirname)
                            echo ">>> Frontend directory: \$FRONTEND_DIR"

                            cd "\$FRONTEND_DIR"
                            npm install --legacy-peer-deps
                            npm run build
                        '
                    """
                }

                echo "✅ Frontend built."
            }
        }

        // ──────────────────────────────────────────────────────
        // STAGE 3: Install Python Backend Dependencies on Oracle VM
        // ──────────────────────────────────────────────────────
        stage('Backends - Install Dependencies') {
            steps {
                echo "🐍 Installing Python deps for all backends on Oracle VM..."

                sshagent(credentials: ['oracle-vm-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${ORACLE_VM_USER}@${ORACLE_VM_IP} '
                            set -e

                            install_venv() {
                                local dir="\$1"
                                local name="\$2"
                                if [ -f "\${dir}/requirements.txt" ]; then
                                    echo ">>> \${name}: installing into .venv..."
                                    cd "\${dir}"
                                    python3 -m venv .venv --upgrade-deps 2>/dev/null || python3 -m venv .venv
                                    . .venv/bin/activate
                                    pip install --upgrade pip wheel -q
                                    pip install -r requirements.txt -q
                                    deactivate
                                    echo ">>> \${name}: done"
                                else
                                    echo ">>> \${name}: no requirements.txt, skipping"
                                fi
                            }

                            install_venv ${APP_DIR}/summarizer-backend                 "summarizer-backend"
                            install_venv ${APP_DIR}/llm-tutor-backend                  "llm-tutor-backend"
                            install_venv ${APP_DIR}/adaptive-reminder-system/backend   "adaptive-reminder-backend"
                            install_venv ${APP_DIR}/emotion-backend                    "emotion-backend"
                        '
                    """
                }

                echo "✅ Backend dependencies installed."
            }
        }

        // ──────────────────────────────────────────────────────
        // STAGE 4: Restart All PM2 Processes on Oracle VM
        // ──────────────────────────────────────────────────────
        stage('Restart PM2 Processes') {
            steps {
                echo "♻️ Re-registering and restarting all PM2 services on Oracle VM..."

                sshagent(credentials: ['oracle-vm-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${ORACLE_VM_USER}@${ORACLE_VM_IP} '
                            set -e
                            export NVM_DIR="\$HOME/.nvm"
                            [ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"

                            APP=${APP_DIR}

                            echo ">>> [1/5] Restarting frontend (Next.js)..."
                            pm2 delete frontend 2>/dev/null || true
                            pm2 start npm \
                                --name frontend \
                                --cwd "\$APP/Frontend" \
                                -- start -- -p 3000

                            echo ">>> [2/5] Restarting summarizer-backend..."
                            pm2 delete summarizer-backend 2>/dev/null || true
                            pm2 start "\$APP/summarizer-backend/.venv/bin/python" \
                                --name summarizer-backend \
                                --cwd "\$APP/summarizer-backend" \
                                -- -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2

                            echo ">>> [3/5] Restarting llm-tutor-backend..."
                            pm2 delete llm-tutor-backend 2>/dev/null || true
                            pm2 start "\$APP/llm-tutor-backend/.venv/bin/python" \
                                --name llm-tutor-backend \
                                --cwd "\$APP/llm-tutor-backend" \
                                -- -m uvicorn main:app --host 0.0.0.0 --port 8002 --workers 2

                            echo ">>> [4/5] Restarting adaptive-reminder-backend..."
                            pm2 delete adaptive-reminder-backend 2>/dev/null || true
                            pm2 start "\$APP/adaptive-reminder-system/backend/.venv/bin/python" \
                                --name adaptive-reminder-backend \
                                --cwd "\$APP/adaptive-reminder-system/backend" \
                                -- -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 2

                            echo ">>> [5/5] Restarting emotion-backend..."
                            pm2 delete emotion-backend 2>/dev/null || true
                            pm2 start "\$APP/emotion-backend/.venv/bin/python" \
                                --name emotion-backend \
                                --cwd "\$APP/emotion-backend" \
                                -- -m uvicorn main:app --host 0.0.0.0 --port 8004 --workers 2

                            pm2 save

                            echo ">>> Final PM2 status:"
                            pm2 list
                        '
                    """
                }

                echo "✅ All PM2 processes re-registered and running."
            }
        }

        // ──────────────────────────────────────────────────────
        // STAGE 5: Health Check (runs on Oracle VM via SSH)
        // ──────────────────────────────────────────────────────
        stage('Health Check') {
            steps {
                echo "🩺 Running health checks on Oracle VM..."

                sshagent(credentials: ['oracle-vm-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${ORACLE_VM_USER}@${ORACLE_VM_IP} '
                            sleep 5

                            check() {
                                local name="\$1"
                                local port="\$2"
                                STATUS=\$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:\${port}/ 2>/dev/null || echo "000")
                                echo "  \${name} (:\${port}) → HTTP \${STATUS}"
                            }

                            echo "=== Service Health ==="
                            check "frontend"                  3000
                            check "summarizer-backend"        8000
                            check "llm-tutor-backend"         8002
                            check "adaptive-reminder-backend" 8001
                            check "emotion-backend"           8004
                        '
                    """
                }

                echo "✅ Health checks complete."
            }
        }
    }

    post {
        success {
            echo "✅ Deployment SUCCESSFUL — Build #${env.BUILD_NUMBER} | Branch: ${GIT_BRANCH}"
        }
        failure {
            echo "❌ Deployment FAILED — Build #${env.BUILD_NUMBER} | Check console output above."
        }
        always {
            echo "🏁 Build #${env.BUILD_NUMBER} finished: ${currentBuild.currentResult}"
        }
    }
}

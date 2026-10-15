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

                            install_reqs() {
                                local dir="\$1"
                                local name="\$2"
                                if [ -f "\${dir}/requirements.txt" ]; then
                                    echo ">>> \${name}: installing..."
                                    cd "\${dir}"
                                    if [ -d "venv" ]; then
                                        . venv/bin/activate
                                        pip install -r requirements.txt --quiet
                                        deactivate
                                    else
                                        pip3 install -r requirements.txt --quiet
                                    fi
                                    echo ">>> \${name}: done"
                                else
                                    echo ">>> \${name}: no requirements.txt, skipping"
                                fi
                            }

                            install_reqs ${APP_DIR}/summarizer-backend        "summarizer-backend"
                            install_reqs ${APP_DIR}/llm-tutor-backend         "llm-tutor-backend"
                            install_reqs ${APP_DIR}/adaptive-reminder-backend "adaptive-reminder-backend"
                            install_reqs ${APP_DIR}/emotion-backend           "emotion-backend"
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
                echo "♻️ Restarting all PM2 services on Oracle VM..."

                sshagent(credentials: ['oracle-vm-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${ORACLE_VM_USER}@${ORACLE_VM_IP} '
                            set -e
                            export NVM_DIR="\$HOME/.nvm"
                            [ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"

                            pm2 restart frontend
                            pm2 restart summarizer-backend
                            pm2 restart llm-tutor-backend
                            pm2 restart adaptive-reminder-backend
                            pm2 restart emotion-backend

                            pm2 save

                            echo ">>> PM2 status:"
                            pm2 list
                        '
                    """
                }

                echo "✅ All PM2 processes restarted."
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

// Configuration
const API_BASE_URL = 'http://localhost:5003';
const ENDPOINTS = {
    HEALTH: `${API_BASE_URL}/api/health`,
    SUMMARIZE: `${API_BASE_URL}/api/summarize`,
};

// State Management
let currentFlashcardIndex = 0;
let flashcards = [];
let isFlipped = false;

// DOM Elements
const fileInput = document.getElementById('file-input');
const fileName = document.getElementById('file-name');
const moduleSelect = document.getElementById('module');
const uploadBtn = document.getElementById('upload-btn');
const resultsSection = document.getElementById('results-section');
const errorMessage = document.getElementById('error-message');
const loadingState = document.getElementById('loading-state');
const apiStatus = document.getElementById('api-status');

// Tab Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Flashcard Elements
const flashcardsContainer = document.getElementById('flashcards-container');
const prevCardBtn = document.getElementById('prev-card');
const nextCardBtn = document.getElementById('next-card');
const cardCounter = document.getElementById('card-counter');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAPIStatus();
});

// Event Listeners
function setupEventListeners() {
    // File Input
    fileInput.addEventListener('change', handleFileSelect);

    // Module Select
    moduleSelect.addEventListener('change', updateUploadButtonState);

    // Upload Button
    uploadBtn.addEventListener('click', handleUpload);

    // Tab Buttons
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => handleTabClick(e));
    });

    // Flashcard Controls
    prevCardBtn?.addEventListener('click', () => previousFlashcard());
    nextCardBtn?.addEventListener('click', () => nextFlashcard());
    flashcardsContainer?.addEventListener('click', (e) => {
        if (e.target.closest('.flashcard')) {
            toggleFlashcard();
        }
    });
}

// File Selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        fileName.style.color = 'var(--text-primary)';
        updateUploadButtonState();
    }
}

// Update Upload Button State
function updateUploadButtonState() {
    const hasFile = fileInput.files.length > 0;
    const hasModule = moduleSelect.value !== '';
    uploadBtn.disabled = !(hasFile && hasModule);
}

// Handle Upload
async function handleUpload() {
    const file = fileInput.files[0];
    const module = moduleSelect.value;

    if (!file || !module) {
        showError('Please select both a file and a module');
        return;
    }

    // Show loading state
    loadingState.style.display = 'flex';
    resultsSection.style.display = 'none';
    errorMessage.style.display = 'none';
    uploadBtn.disabled = true;

    // Show spinner
    const spinner = uploadBtn.querySelector('.spinner');
    spinner.style.display = 'inline-block';

    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('module', module);

        const response = await fetch(ENDPOINTS.SUMMARIZE, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        displayResults(data);
        loadingState.style.display = 'none';
        resultsSection.style.display = 'block';
        switchTab('summary');

    } catch (error) {
        console.error('Error:', error);
        showError(`Failed to process lecture: ${error.message}`);
        loadingState.style.display = 'none';
    } finally {
        uploadBtn.disabled = false;
        spinner.style.display = 'none';
    }
}

// Display Results
function displayResults(data) {
    // Display Summary
    displaySummary(data.summary_sentences || []);

    // Display Flashcards
    flashcards = data.flashcards || [];
    displayFlashcards();

    // Display Statistics
    displayStatistics(data.statistics, data.module_name || 'N/A');
}

// Display Summary
function displaySummary(sentences) {
    const container = document.getElementById('summary-content');
    container.innerHTML = '';

    if (sentences.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No key sentences extracted.</p>';
        return;
    }

    sentences.forEach((sentence, index) => {
        const div = document.createElement('div');
        div.className = 'summary-sentence';
        div.innerHTML = `
            <strong>Sentence ${index + 1}:</strong>
            <p>${escapeHtml(sentence)}</p>
        `;
        container.appendChild(div);
    });
}

// Display Flashcards
function displayFlashcards() {
    currentFlashcardIndex = 0;
    isFlipped = false;

    if (flashcards.length === 0) {
        flashcardsContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 1.1rem;">No flashcards generated.</p>';
        return;
    }

    renderFlashcard();
}

// Render Current Flashcard
function renderFlashcard() {
    if (flashcards.length === 0) return;

    const card = flashcards[currentFlashcardIndex];
    flashcardsContainer.innerHTML = `
        <div class="flashcard ${isFlipped ? 'answer-side' : ''}">
            <div class="flashcard-hint">Click to flip</div>
            <div class="flashcard-content">
                <div class="flashcard-label">${isFlipped ? 'Answer' : 'Question'}</div>
                <div class="flashcard-text">
                    ${escapeHtml(isFlipped ? card.answer : card.question)}
                </div>
                ${card.learning_objective ? `
                    <div class="flashcard-meta">
                        <strong>Learning Objective:</strong> ${escapeHtml(card.learning_objective)}
                        <br><strong>Difficulty:</strong> ${escapeHtml(card.difficulty || 'N/A')}
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    // Update counter
    cardCounter.textContent = `${currentFlashcardIndex + 1} / ${flashcards.length}`;

    // Update button states
    prevCardBtn.disabled = currentFlashcardIndex === 0;
    nextCardBtn.disabled = currentFlashcardIndex === flashcards.length - 1;
}

// Toggle Flashcard — squeeze-flip, swap content at midpoint
function toggleFlashcard() {
    const card = flashcardsContainer.querySelector('.flashcard');
    if (!card) return;

    // Phase 1: squeeze out
    card.classList.add('flip-out');

    setTimeout(() => {
        // Swap content at the flat midpoint
        isFlipped = !isFlipped;
        renderFlashcard();

        // Phase 2: expand in
        const newCard = flashcardsContainer.querySelector('.flashcard');
        if (newCard) newCard.classList.add('flip-in');
    }, 180);
}

// Previous Flashcard
function previousFlashcard() {
    if (currentFlashcardIndex > 0) {
        currentFlashcardIndex--;
        isFlipped = false;
        renderFlashcard();
    }
}

// Next Flashcard
function nextFlashcard() {
    if (currentFlashcardIndex < flashcards.length - 1) {
        currentFlashcardIndex++;
        isFlipped = false;
        renderFlashcard();
    }
}

// Display Statistics
function displayStatistics(stats, moduleName) {
    const container = document.getElementById('statistics-content');
    container.innerHTML = '';

    if (!stats) {
        container.innerHTML = '<p style="color: var(--text-secondary);">No statistics available.</p>';
        return;
    }

    const statItems = [
        {
            label: 'Module',
            value: moduleName,
            icon: '📚'
        },
        {
            label: 'Total Sentences',
            value: stats.total_sentences || 0,
            icon: '📝'
        },
        {
            label: 'Key Sentences',
            value: stats.selected_sentences || 0,
            icon: '⭐'
        },
        {
            label: 'Coverage',
            value: `${(stats.coverage_percentage || 0).toFixed(1)}%`,
            icon: '📊'
        },
        {
            label: 'Average Score',
            value: (stats.average_score || 0).toFixed(2),
            icon: '🎯'
        },
        {
            label: 'Score Range',
            value: stats.score_range ? `${stats.score_range[0].toFixed(2)} - ${stats.score_range[1].toFixed(2)}` : 'N/A',
            icon: '📈'
        }
    ];

    statItems.forEach(item => {
        const box = document.createElement('div');
        box.className = 'stat-box';
        box.innerHTML = `
            <div class="stat-label">${item.icon} ${item.label}</div>
            <div class="stat-value">${item.value}</div>
        `;
        container.appendChild(box);
    });
}

// Tab Switching
function handleTabClick(e) {
    const tabName = e.target.dataset.tab;
    switchTab(tabName);
}

function switchTab(tabName) {
    // Update buttons
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update content
    tabContents.forEach(content => {
        content.style.display = 'none';
    });

    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
        activeTab.style.display = 'block';
    }
}

// Error Handling
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'flex';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// API Status Check
async function checkAPIStatus() {
    try {
        const response = await fetch(ENDPOINTS.HEALTH);
        if (response.ok) {
            apiStatus.textContent = 'Online';
            apiStatus.classList.add('online');
        } else {
            apiStatus.textContent = 'Offline';
        }
    } catch (error) {
        apiStatus.textContent = 'Offline';
        console.warn('API status check failed:', error);
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Retry API Status Check Periodically
setInterval(checkAPIStatus, 30000);

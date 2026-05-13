# 🎓 AURA Learn — Component 3: Lecture Summarizer & Flashcard Generator

> **Part of the AURA Learn intelligent e-learning platform** — an AI-driven system that processes SLIIT lecture slides (PDF/PPTX) and produces module-specific summaries and auto-generated flashcards using a trained Machine Learning model.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [System Architecture Diagram](#system-architecture-diagram)
3. [Component Breakdown](#component-breakdown)
   - [Frontend](#1-frontend)
   - [Backend (Flask API)](#2-backend-flask-api)
   - [ML Pipeline](#3-ml-pipeline)
   - [Dataset](#4-dataset)
   - [Module Configuration](#5-module-configuration)
   - [Lecture Files](#6-lecture-files)
4. [Data Flow](#data-flow)
5. [API Reference](#api-reference)
6. [ML Model Details](#ml-model-details)
7. [Supported Modules](#supported-modules)
8. [Setup & Running](#setup--running)
9. [File Structure](#file-structure)

---

## Overview

Component 3 of the AURA Learn system is a **Lecture Summarization & Flashcard Generation** service. Users upload a PDF or PPTX lecture slide deck, select the appropriate SLIIT module, and the system:

1. Extracts raw text from the document.
2. Cleans and tokenizes it into sentences.
3. Scores each sentence using a **trained RandomForest ML model** (with a TF-IDF + structural feature vector).
4. Selects the top important sentences as the **summary**.
5. Auto-generates **Q&A flashcards** mapped to the module's learning objectives.

The service runs as a standalone **Flask REST API** on port `5003` and is consumed by a lightweight HTML/CSS/JS frontend.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AURA Learn — Component 3                          │
│                  Lecture Summarizer & Flashcard Generator                   │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────────────────────────────────────────┐
    │                      USER BROWSER                     │
    │                                                       │
    │   ┌─────────────┐   ┌──────────────┐  ┌──────────┐   │
    │   │ Upload Form │   │ Module Select│  │ API Status│  │
    │   │ (PDF/PPTX)  │   │  (IT2040...) │  │ Indicator │  │
    │   └──────┬──────┘   └──────┬───────┘  └──────────┘   │
    │          │                 │                           │
    │          └────────┬────────┘                          │
    │                   │ FormData (multipart)               │
    │          ┌────────▼────────┐                          │
    │          │   script.js     │  Tab UI: Summary /        │
    │          │  (Vanilla JS)   │  Flashcards / Statistics  │
    │          └────────┬────────┘                          │
    └───────────────────┼───────────────────────────────────┘
                        │ HTTP POST /api/summarize
                        │ HTTP GET  /api/health
                        │ HTTP GET  /api/modules
                        ▼
    ┌───────────────────────────────────────────────────────┐
    │              FLASK BACKEND  (port 5003)               │
    │                    app.py                             │
    │                                                       │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
    │  │  /api/health│  │/api/modules │  │/api/summarize│   │
    │  │  GET        │  │  GET        │  │   POST       │   │
    │  └─────────────┘  └─────────────┘  └──────┬──────┘   │
    │                                            │          │
    │  ┌─────────────────────────────────────────▼──────┐   │
    │  │              TEXT EXTRACTION LAYER              │   │
    │  │  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │   │
    │  │  │  PyPDF2  │  │ python-  │  │  Plain Text │  │   │
    │  │  │ (PDF)    │  │  pptx    │  │  (.txt)     │  │   │
    │  │  │          │  │ (PPTX)   │  │             │  │   │
    │  │  └──────────┘  └──────────┘  └─────────────┘  │   │
    │  └─────────────────────────┬───────────────────────┘  │
    │                            │ Raw text                  │
    │  ┌─────────────────────────▼───────────────────────┐  │
    │  │          SENTENCE CLEANING & TOKENIZATION        │  │
    │  │  • Remove slide headers / footers                │  │
    │  │  • Remove boilerplate (module codes, names)      │  │
    │  │  • Filter: word count 6-80, alpha ratio >0.55    │  │
    │  │  • Detect & skip outline-only / all-caps slides  │  │
    │  │  • NLTK sent_tokenize                            │  │
    │  └─────────────────────────┬───────────────────────┘  │
    │                            │ Clean sentences[ ]        │
    │  ┌─────────────────────────▼───────────────────────┐  │
    │  │              ML SCORING ENGINE                   │  │
    │  │                                                  │  │
    │  │  TF-IDF Features (200)  ─────┐                   │  │
    │  │  Structural Features (21) ───┼─► RandomForest    │  │
    │  │    • word count               │   Classifier      │  │
    │  │    • definition detection     │   (universal_     │  │
    │  │    • acronym / tech terms     │    model.pkl)     │  │
    │  │    • enumeration, causal      │                   │  │
    │  │    • position in doc          │  Threshold: 0.497 │  │
    │  │                               └──► importance     │  │
    │  │                                    probability    │  │
    │  │  + Keyword Score (module keywords)               │  │
    │  │  + Position Score (early = higher weight)        │  │
    │  │                                                  │  │
    │  │  Final Score = 0.65×ML + 0.25×Keywords + 0.10×Pos│  │
    │  └─────────────────────────┬───────────────────────┘  │
    │                            │ Top N sentences           │
    │  ┌─────────────────────────▼───────────────────────┐  │
    │  │           FLASHCARD GENERATOR                    │  │
    │  │  Pattern matching → Q&A pairs                    │  │
    │  │  Tagged by Learning Objective (LO1-LO5)          │  │
    │  │  Difficulty: easy / medium / hard                │  │
    │  └─────────────────────────┬───────────────────────┘  │
    │                            │ JSON response             │
    └────────────────────────────┼──────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Persistent Model Files  │
                    │  ┌───────────────────┐   │
                    │  │ universal_model   │   │
                    │  │    .pkl (~3 MB)   │   │
                    │  ├───────────────────┤   │
                    │  │  vectorizer.pkl   │   │
                    │  │   (TF-IDF, 200)   │   │
                    │  ├───────────────────┤   │
                    │  │ module_config.json│   │
                    │  │  (6 modules, LOs) │   │
                    │  ├───────────────────┤   │
                    │  │universal_metadata │   │
                    │  │ .json (threshold) │   │
                    │  └───────────────────┘   │
                    └──────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend

**Location:** `frontend/`

| File | Purpose |
|------|---------|
| `index.html` | Main UI shell — upload form, tab navigation, results pane |
| `styles.css` | Vanilla CSS design system — dark theme, glassmorphism cards, animations |
| `script.js` | Vanilla JS application logic — API calls, state management, UI rendering |

#### Key UI Sections

| Section | Description |
|---------|-------------|
| **Upload Form** | File picker (PDF/PPTX) + module dropdown |
| **Summary Tab** | Numbered list of top-ranked key sentences extracted from the lecture |
| **Flashcards Tab** | Flip-card Q&A pairs; navigate with Previous / Next; click to reveal answer |
| **Statistics Tab** | Coverage %, total vs selected sentences, average ML score, score range |
| **API Status** | Live health indicator (polls `/api/health` every 30 s) |

#### `script.js` — Architecture

```
setupEventListeners()
    ├── handleFileSelect()       — validates file & enables button
    ├── updateUploadButtonState()
    ├── handleUpload()           — FormData POST → /api/summarize
    │       └── displayResults()
    │               ├── displaySummary(sentences[])
    │               ├── displayFlashcards()
    │               │       ├── renderFlashcard()
    │               │       └── toggleFlashcard()  ← squeeze-flip animation
    │               └── displayStatistics(stats, moduleName)
    └── handleTabClick()         — switches Summary / Flashcards / Statistics

checkAPIStatus()                 — periodic GET /api/health
```

---

### 2. Backend (Flask API)

**Location:** `backend/app.py`

The backend is a **Flask** application with three REST endpoints.

#### Startup Sequence

```
app.py starts
    ├── load_models()
    │       ├── Load universal_model.pkl     (RandomForest)
    │       ├── Load vectorizer.pkl          (TF-IDF, 200 features)
    │       ├── Load module_config.json      (6 SLIIT modules)
    │       └── Load universal_metadata.json (optimal threshold)
    └── app.run(port=5003)
```

#### Core Processing Functions

| Function | Description |
|----------|-------------|
| `extract_text_from_pdf()` | Uses **PyPDF2** to read all pages; returns concatenated text |
| `extract_text_from_pptx()` | Uses **python-pptx** to iterate shapes; returns joined text |
| `extract_sentences_from_text()` | Multi-stage cleaning + NLTK tokenization + quality filters |
| `extract_structural_features()` | Computes 21 handcrafted features per sentence |
| `score_sentences_with_model()` | TF-IDF → structural → hstack → RandomForest → rescaled probabilities |
| `generate_flashcards_from_sentences()` | Regex pattern matching to form varied Q&A types |

#### `extract_sentences_from_text()` — Filtering Pipeline

```
Raw text
  ├── Strip form-feeds, control chars, CID artifacts
  ├── Remove module-code headers (e.g. "IT2060 - OS | Lecture 02")
  ├── Normalise newlines → paragraph breaks
  ├── NLTK sent_tokenize()
  └── Per-sentence filters:
        ├── Strip bullet/dash prefixes
        ├── Remove instructor names & slide footers
        ├── Word count gate: 6 ≤ words ≤ 80
        ├── Alpha ratio ≥ 0.55
        ├── Slide outline detector (title-case ratio > 55% + no verb → skip)
        ├── All-caps ratio > 40% → skip (diagram labels)
        ├── Jammed-word detector (> 2 words > 20 chars → skip)
        └── Must contain at least one verb
```

#### `extract_structural_features()` — 21 Features

| # | Feature | Description |
|---|---------|-------------|
| 0 | `word_count` | Number of words |
| 1 | `avg_word_len` | Mean word length |
| 2 | `capital_ratio` | Fraction of uppercase characters |
| 3 | `digit_ratio` | Fraction of digit characters |
| 4 | `punct_ratio` | Fraction of punctuation characters |
| 5 | `is_definition` | Matches tightened definition patterns |
| 6 | `has_acronym_expansion` | Pattern `ABC (Full form…)` |
| 7 | `is_composition` | "consists of / includes" + tech noun |
| 8 | `is_enumeration` | "there are N …" |
| 9 | `is_conclusion` | "therefore / thus / hence / in summary" |
| 10 | `has_advantage_keyword` | "advantage / benefit / drawback" |
| 11 | `has_causal_connector` | "because / due to / in order to" |
| 12 | `has_example_marker` | "for example / e.g. / such as" |
| 13 | `has_comparison` | "compared to / in contrast / unlike" |
| 14 | `is_functional` | "is used for / enables / ensures" + tech noun |
| 15 | `acronym_count` | Count of `[A-Z]{2,}` tokens |
| 16 | `tech_term_count` | Count of domain technical terms |
| 17 | `position_ratio` | Relative position in document (0.0–1.0) |
| 18 | `has_email` | Contains `@domain.ext` |
| 19 | `is_boilerplate` | "copyright / all rights reserved" |
| 20 | `is_reference` | Starts with "see / refer to / read" |

#### Scoring Blend

```
if ML model loaded:
    final_score = 0.65 × ML_score  +  0.25 × keyword_score  +  0.10 × position_score
else (fallback):
    final_score = 0.60 × keyword_score  +  0.40 × position_score
```

Top **5–30 sentences** (up to 15% of total) are selected, sorted by original order.

#### `generate_flashcards_from_sentences()` — Question Types

| Pattern Matched | Question Type | Difficulty |
|----------------|--------------|-----------|
| `X is/refers to/means Y` | "What is X?" | easy |
| `X consists of / includes Y` | "What does X consist of?" | easy |
| step / process / procedure | "Describe the process: …" | medium |
| advantage / benefit / important | "Why is this important: …?" | medium |
| difference / compare / unlike | "Compare and contrast: …" | hard |
| example / such as / e.g. | "Give an example related to: …" | easy |
| formula / equation / calculate | "What is the formula/method for: …?" | hard |
| default | "What is the key idea: …?" | medium |

Each flashcard is tagged with a **Learning Objective ID** (LO1–LO5) cycled across the selected sentences.

---

### 3. ML Pipeline

**Location:** `SLIIT_Summarizer_Colab.ipynb` (training notebook)

The model was trained in Google Colab on SLIIT lecture PDFs.

```
Training Pipeline
    ├── 1. Extract sentences from 6 lecture PDFs
    │        (extract_sentences_multi_module.py)
    ├── 2. Auto-label sentences as important / not-important
    │        (auto_label_multi_module.py)
    │        Rules: definitions, compositions, tech terms, etc.
    ├── 3. Build features
    │        200 TF-IDF + 21 structural = 221 total features
    ├── 4. Train RandomForestClassifier
    │        5-fold cross-validation
    │        Tune optimal_threshold via F1 maximization
    └── 5. Save artifacts
             ├── universal_model.pkl    (~3 MB)
             ├── vectorizer.pkl         (TF-IDF vocabulary)
             └── universal_metadata.json (metrics + threshold)
```

#### Model Performance (from `universal_metadata.json`)

| Metric | Value |
|--------|-------|
| Accuracy | **91.96%** |
| Precision | **86.02%** |
| Recall | **94.12%** |
| F1-Score | **89.89%** |
| CV F1 Mean | **84.98%** |
| CV F1 Std | ±5.20% |
| Optimal Threshold | **0.4968** |
| Training sentences | **4,476** |
| TF-IDF features | 200 |
| Structural features | 21 |
| Total features | 221 |

---

### 4. Dataset

**Location:** `Dataset/`

| File | Description |
|------|-------------|
| `extracted_sentences (2).csv` | Raw sentences extracted from all 6 lecture PDFs (~1.3 MB) |
| `labeled_sentences (2).csv` | Same sentences with `important` / `not_important` labels (~1.4 MB) |

The class distribution used for training:
- **Important sentences:** 1,700
- **Not-important sentences:** 2,776

---

### 5. Module Configuration

**Location:** `backend/module_config.json`

Defines per-module metadata used for **keyword scoring** and **learning objective tagging**.

```json
{
  "modules": [
    {
      "id": "IT2040",
      "name": "Database Management Systems",
      "learning_objectives": ["LO1: ...", "LO2: ...", ...],
      "keywords": ["database", "SQL", "ACID", ...],
      "relevant_topics": ["Conceptual Design", ...]
    },
    ...
  ]
}
```

Each module entry contains:
- **`id`** — Module code (used as the key in API requests)
- **`name`** — Human-readable module name
- **`description`** — Brief course description
- **`learning_objectives`** — LO1–LO5 (or more) strings
- **`keywords`** — Domain-specific vocabulary for keyword scoring
- **`relevant_topics`** — Logical topic groupings

---

### 6. Lecture Files

**Location:** `Lectures/`

Six SLIIT lecture PDFs included for training and testing:

| File | Module | Size |
|------|--------|------|
| `IT2040_DATABASE_MANAGEMENT_SYSTEMS.pdf` | IT2040 | 2.4 MB |
| `IT2060_Operating_Systems.pdf` | IT2060 | 9.6 MB |
| `IT3010_Network_Design_Management.pdf` | IT3010 | 27 MB |
| `IT3020_Database_System.pdf` | IT3020 | 4.1 MB |
| `IT3030_Programming_Applications.pdf` | IT3030 | 7.4 MB |
| `IT4070_Professional_World.pdf` | IT4070 | 10.5 MB |

---

## Data Flow

```
User selects file + module
        │
        ▼
POST /api/summarize  (multipart form)
        │
        ├─► Extract text (PyPDF2 / python-pptx)
        │
        ├─► Clean & tokenize sentences (NLTK + regex filters)
        │
        ├─► Score sentences
        │       ├─ TF-IDF vectorize  (vectorizer.pkl)
        │       ├─ Compute 21 structural features
        │       └─ RandomForest predict_proba  (universal_model.pkl)
        │           + keyword score (module_config.json keywords)
        │           + position score
        │
        ├─► Select top N sentences  (15% of total, max 30)
        │
        ├─► Generate flashcards (regex Q&A, LO tagging)
        │
        └─► Return JSON
                {
                  module_id, module_name,
                  learning_objectives,
                  summary,
                  summary_sentences[],
                  flashcards[{ question, answer, lo, difficulty }],
                  statistics{ total, selected, coverage%, avg_score }
                }
        │
        ▼
Frontend renders:
  📝 Summary tab   → numbered sentence list
  🎯 Flashcards tab → flip-card Q&A
  📊 Statistics tab → score metrics grid
```

---

## API Reference

Base URL: `http://localhost:5003`

### `GET /api/health`

Returns system component status.

**Response:**
```json
{
  "status": "ok",
  "nlp_available": true,
  "pdf_available": true,
  "pptx_available": true,
  "ml_model_available": true,
  "module_config_available": true
}
```

---

### `GET /api/modules`

Returns list of all configured modules with their learning objectives.

**Response:**
```json
{
  "total_modules": 6,
  "modules": [
    {
      "id": "IT2040",
      "name": "Database Management Systems",
      "description": "...",
      "learning_objectives": ["LO1: ...", ...],
      "topics": ["Conceptual Design", ...]
    }
  ]
}
```

---

### `POST /api/summarize`

Processes an uploaded lecture file and returns a summary + flashcards.

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | PDF, PPTX, or TXT lecture file |
| `module` or `module_id` | string | Module code (e.g. `IT2040`) |
| `use_ml_model` | string | `"true"` (default) or `"false"` |

**Response:**
```json
{
  "module_id": "IT2040",
  "module_name": "Database Management Systems",
  "learning_objectives": ["LO1: ...", ...],
  "summary": "Full summary text...",
  "summary_sentences": ["Sentence 1", "Sentence 2", ...],
  "flashcards": [
    {
      "id": 1,
      "question": "What is a primary key?",
      "answer": "A primary key is a unique identifier...",
      "module": "IT2040",
      "learning_objective": "LO1",
      "lo_text": "LO1: Design and develop database solutions",
      "difficulty": "easy"
    }
  ],
  "statistics": {
    "total_sentences": 240,
    "selected_sentences": 22,
    "coverage_percentage": 9.2,
    "average_score": 0.742,
    "score_range": [0.561, 0.934]
  },
  "model_info": {
    "type": "ML RandomForest + Module Adaptation",
    "ml_model_used": true,
    "fallback_used": false
  }
}
```

---

### `POST /api/flashcards`

Generate flashcards from an existing summary (JSON body).

**Request:**
```json
{
  "module_id": "IT2040",
  "summary": "A primary key uniquely identifies each row..."
}
```

---

## ML Model Details

### Algorithm
**Random Forest Classifier** — ensemble of decision trees trained on sentence-level features.

### Feature Vector (221 dimensions)

```
[  TF-IDF features (200)  |  Structural features (21)  ]
```

The TF-IDF vectorizer uses the vocabulary learned from the 4,476 training sentences, with instructor-specific noise terms (e.g. `"sanvitha"`, `"kasthuriarachchi"`) excluded.

### Threshold Calibration
The raw `predict_proba` output is rescaled so that `optimal_threshold (0.4968)` maps to `0.5`:

```python
scores = raw_probs / (2.0 * optimal_threshold)
```

This enables a balanced blend with keyword and position signals.

### Fallback Mode
If `universal_model.pkl` or `vectorizer.pkl` are missing, the system falls back to **keyword + position scoring only** (no ML). The API response will include `"fallback_used": true`.

---

## Supported Modules

| Module Code | Name | Learning Objectives |
|-------------|------|---------------------|
| IT2040 | Database Management Systems | 5 LOs (Design, SQL, Connectivity, Maintenance, Security) |
| IT2060 | Operating Systems & System Administration | 7 LOs (Process, Memory, File Systems, I/O, Security, Unix) |
| IT3010 | Network Design & Management | 5 LOs (Architecture, Routing, Security, Monitoring, Design) |
| IT3020 | Database Systems (Advanced) | 5 LOs (SQL, Distributed, NoSQL, Warehousing, Big Data) |
| IT3030 | Programming Applications | 5 LOs (Data Structures, Algorithms, Patterns, Testing, Workflow) |
| IT4070 | Professional World | 5 LOs (Ethics, PM, IP Law, Communication, Career) |

---

## Setup & Running

### Prerequisites

```bash
pip install flask flask-cors scikit-learn nltk PyPDF2 python-pptx numpy
```

### Start the Backend

```bash
cd backend
python app.py
```

Server starts at **`http://localhost:5003`**.

### Open the Frontend

Open `frontend/index.html` directly in a browser, or serve with a simple HTTP server:

```bash
cd frontend
python -m http.server 8080
# Then open http://localhost:8080
```

### Verify the System

```bash
curl http://localhost:5003/api/health
```

Expected: `{"status": "ok", "ml_model_available": true, ...}`

### Retrain the Model (optional)

If you want to retrain the ML model with new lecture PDFs:

```bash
python3 scripts/extract_sentences_multi_module.py
python3 scripts/auto_label_multi_module.py
python3 scripts/train_universal_model.py
```

Or use the **`SLIIT_Summarizer_Colab.ipynb`** notebook in Google Colab.

---

## File Structure

```
component3-summarizer/
├── README.md                          ← This file
│
├── backend/
│   ├── app.py                         ← Flask REST API (main entry point)
│   ├── module_config.json             ← 6 SLIIT modules: keywords, LOs, topics
│   ├── universal_model.pkl            ← Trained RandomForest (~3 MB)
│   ├── vectorizer.pkl                 ← TF-IDF vectorizer (200 features)
│   └── universal_metadata.json        ← Model metrics + optimal threshold
│
├── frontend/
│   ├── index.html                     ← Single-page UI
│   ├── styles.css                     ← Dark theme CSS design system
│   └── script.js                      ← Vanilla JS (API calls, tab UI, flashcards)
│
├── Dataset/
│   ├── extracted_sentences (2).csv    ← Raw training sentences (~1.3 MB)
│   └── labeled_sentences (2).csv     ← Labeled training data (~1.4 MB)
│
├── Lectures/
│   ├── IT2040_DATABASE_MANAGEMENT_SYSTEMS.pdf
│   ├── IT2060_Operating_Systems.pdf
│   ├── IT3010_Network_Design_Management.pdf
│   ├── IT3020_Database_System.pdf
│   ├── IT3030_Programming_Applications.pdf
│   └── IT4070_Professional_World.pdf
│
└── SLIIT_Summarizer_Colab.ipynb       ← Google Colab training notebook
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, Vanilla CSS, Vanilla JavaScript |
| Backend | Python 3, Flask, Flask-CORS |
| ML Model | scikit-learn RandomForestClassifier |
| NLP | NLTK (sentence tokenization) |
| Text Extraction | PyPDF2 (PDF), python-pptx (PPTX) |
| Feature Engineering | TF-IDF (200) + 21 structural features |
| Training Environment | Google Colab |

---

*AURA Learn © 2026 — Powered by AI-driven Lecture Analysis*

# LOA-ESS Evaluation Framework

This directory contains the research evaluation scripts, notebooks, and data
for comparing LOA-ESS against baseline summarization systems.

## Structure

```
evaluation/
├── notebooks/
│   ├── 01_automatic_metrics.ipynb    # ROUGE, BERTScore, LOCS, ERS
│   ├── 02_human_evaluation.ipynb     # Analysis of human evaluator ratings
│   ├── 03_statistical_tests.ipynb    # Significance testing (Wilcoxon, Friedman)
│   └── 04_results_visualization.ipynb # Charts, tables for thesis
├── data/
│   ├── reference_summaries/          # Gold-standard summaries
│   ├── baseline_outputs/             # ChatGPT, Gemini, Claude, NotebookLM outputs
│   └── human_ratings/                # Evaluator ratings CSV files
└── scripts/
    ├── generate_baselines.py         # Generate summaries from baseline systems
    └── run_evaluation.py             # Run automatic evaluation pipeline
```

## Evaluation Metrics

| Metric | Type | Novel? |
|--------|------|--------|
| ROUGE-1/2/L | Automatic | No |
| BERTScore | Automatic | No |
| BLEU | Automatic | No |
| **LOCS** | Automatic | **Yes** — Learning Outcome Coverage Score |
| **BAS** | Automatic | **Yes** — Bloom's Alignment Score |
| **ERS** | Composite | **Yes** — Educational Relevance Score |
| **SGR** | Automatic | **Yes** — Source Grounding Rate |
| Human Educational Relevance | Human | No |
| Human Exam Readiness | Human | No |

## Baselines

1. **ChatGPT-4o** — same source materials, no LO context
2. **Gemini 2.5 Pro** — same source materials, no LO context
3. **Claude Sonnet 4** — same source materials, no LO context
4. **NotebookLM** — same source materials uploaded
5. **LOA-ESS** — our system with LO-RAG pipeline

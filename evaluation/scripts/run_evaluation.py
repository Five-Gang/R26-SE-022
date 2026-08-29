"""Run automatic evaluation pipeline for LOA-ESS.

Compares LOA-ESS generated summaries against baselines using:
- ROUGE-1/2/L
- BERTScore
- LOCS (novel)
- ERS (novel)

Usage:
    python scripts/run_evaluation.py --data-dir ../data --output-dir ../results
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Add backend to path for importing evaluation services
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))


def compute_rouge(hypothesis: str, reference: str) -> dict:
    """Compute ROUGE-1/2/L scores."""
    from rouge_score import rouge_scorer

    scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
    scores = scorer.score(reference, hypothesis)

    return {
        "rouge1_f": scores["rouge1"].fmeasure,
        "rouge2_f": scores["rouge2"].fmeasure,
        "rougeL_f": scores["rougeL"].fmeasure,
    }


def compute_bertscore(hypotheses: list[str], references: list[str]) -> list[dict]:
    """Compute BERTScore for a batch of summaries."""
    from bert_score import score as bert_score

    P, R, F1 = bert_score(hypotheses, references, lang="en", verbose=False)

    return [
        {"precision": p.item(), "recall": r.item(), "f1": f.item()}
        for p, r, f in zip(P, R, F1)
    ]


async def compute_locs(summary: str, learning_outcomes: list[dict]) -> dict:
    """Compute Learning Outcome Coverage Score."""
    from app.services.evaluation.lo_coverage_scorer import LOCoverageScorer

    scorer = LOCoverageScorer(coverage_threshold=0.5)
    result = await scorer.compute(summary, learning_outcomes)

    return {
        "overall_score": result.overall_score,
        "covered_count": result.covered_count,
        "total_count": result.total_count,
        "per_lo_scores": result.per_lo_scores,
    }


async def compute_ers(
    summary: str,
    learning_outcomes: list[dict],
    source_chunks: list[dict] | None = None,
) -> dict:
    """Compute Educational Relevance Score."""
    from app.services.evaluation.ers_calculator import ERSCalculator

    calculator = ERSCalculator()
    result = await calculator.compute(summary, learning_outcomes, source_chunks)

    return {
        "ers_score": result.ers_score,
        "locs": result.locs,
        "bas": result.bas,
        "sgr": result.sgr,
        "coherence": result.coherence,
    }


def load_evaluation_data(data_dir: str) -> list[dict]:
    """Load evaluation dataset.

    Expected structure:
    data_dir/
    ├── reference_summaries/
    │   ├── module1_week1.json
    │   └── ...
    └── baseline_outputs/
        ├── chatgpt/
        ├── gemini/
        ├── claude/
        ├── notebooklm/
        └── loa_ess/
    """
    data = []
    ref_dir = Path(data_dir) / "reference_summaries"

    if not ref_dir.exists():
        print(f"Warning: Reference summaries directory not found: {ref_dir}")
        return data

    for ref_file in sorted(ref_dir.glob("*.json")):
        with open(ref_file) as f:
            entry = json.load(f)

        # Load baseline outputs
        baselines = {}
        for system in ["chatgpt", "gemini", "claude", "notebooklm", "loa_ess"]:
            baseline_file = Path(data_dir) / "baseline_outputs" / system / ref_file.name
            if baseline_file.exists():
                with open(baseline_file) as f:
                    baselines[system] = json.load(f)

        entry["baselines"] = baselines
        data.append(entry)

    return data


async def run_evaluation(data_dir: str, output_dir: str):
    """Run the complete evaluation pipeline."""
    import asyncio

    os.makedirs(output_dir, exist_ok=True)

    print("Loading evaluation data...")
    data = load_evaluation_data(data_dir)

    if not data:
        print("No evaluation data found. Create reference summaries first.")
        print(f"Expected location: {data_dir}/reference_summaries/*.json")
        return

    print(f"Loaded {len(data)} evaluation entries")

    all_results = []

    for entry in data:
        topic = entry.get("topic", "Unknown")
        reference = entry.get("reference_summary", "")
        los = entry.get("learning_outcomes", [])

        print(f"\nEvaluating: {topic}")

        entry_results = {"topic": topic, "systems": {}}

        for system, output in entry.get("baselines", {}).items():
            hypothesis = output.get("summary", "")

            print(f"  → {system}...")

            # ROUGE
            rouge = compute_rouge(hypothesis, reference)

            # LOCS
            locs = await compute_locs(hypothesis, los)

            # ERS
            ers = await compute_ers(hypothesis, los)

            entry_results["systems"][system] = {
                **rouge,
                "locs": locs["overall_score"],
                "ers": ers["ers_score"],
                "ers_components": ers,
            }

        all_results.append(entry_results)

    # Compute BERTScore in batch for efficiency
    for entry in all_results:
        reference = next(
            (d["reference_summary"] for d in data if d["topic"] == entry["topic"]),
            "",
        )
        systems = list(entry["systems"].keys())
        hypotheses = [
            next(
                (d["baselines"][s]["summary"] for d in data if d["topic"] == entry["topic"]),
                "",
            )
            for s in systems
        ]
        references_list = [reference] * len(systems)

        if hypotheses and all(h for h in hypotheses):
            bert_scores = compute_bertscore(hypotheses, references_list)
            for system, bs in zip(systems, bert_scores):
                entry["systems"][system]["bertscore_f1"] = bs["f1"]

    # Save results
    output_file = Path(output_dir) / "evaluation_results.json"
    with open(output_file, "w") as f:
        json.dump(all_results, f, indent=2)

    print(f"\nResults saved to: {output_file}")

    # Print summary table
    print("\n" + "=" * 80)
    print("EVALUATION RESULTS SUMMARY")
    print("=" * 80)
    print(f"{'System':<15} {'ROUGE-L':>10} {'BERTScore':>10} {'LOCS':>10} {'ERS':>10}")
    print("-" * 55)

    # Average across topics
    system_averages = {}
    for entry in all_results:
        for system, scores in entry["systems"].items():
            if system not in system_averages:
                system_averages[system] = {"rouge": [], "bert": [], "locs": [], "ers": []}
            system_averages[system]["rouge"].append(scores.get("rougeL_f", 0))
            system_averages[system]["bert"].append(scores.get("bertscore_f1", 0))
            system_averages[system]["locs"].append(scores.get("locs", 0))
            system_averages[system]["ers"].append(scores.get("ers", 0))

    for system, avgs in system_averages.items():
        avg_r = sum(avgs["rouge"]) / max(len(avgs["rouge"]), 1)
        avg_b = sum(avgs["bert"]) / max(len(avgs["bert"]), 1)
        avg_l = sum(avgs["locs"]) / max(len(avgs["locs"]), 1)
        avg_e = sum(avgs["ers"]) / max(len(avgs["ers"]), 1)
        marker = " ★" if system == "loa_ess" else ""
        print(f"{system:<15} {avg_r:>10.4f} {avg_b:>10.4f} {avg_l:>10.4f} {avg_e:>10.4f}{marker}")


if __name__ == "__main__":
    import asyncio

    parser = argparse.ArgumentParser(description="LOA-ESS Evaluation Pipeline")
    parser.add_argument("--data-dir", default="../data", help="Path to evaluation data")
    parser.add_argument("--output-dir", default="../results", help="Path for output results")
    args = parser.parse_args()

    asyncio.run(run_evaluation(args.data_dir, args.output_dir))

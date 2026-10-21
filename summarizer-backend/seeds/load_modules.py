"""
LOA-ESS Module Seed Loader
===========================
Loads all SLIIT module outlines from seeds/modules/*.json into the database.

Usage:
    cd backend/
    source venv/bin/activate
    python seeds/load_modules.py                    # Load all modules
    python seeds/load_modules.py SE4040             # Load only SE4040
    python seeds/load_modules.py --reset SE4040     # Wipe & reload SE4040

Place each module's outline as:
    seeds/modules/<MODULE_CODE>_<ModuleName>.json

The JSON schema for each file:
    {
      "code": "SE4040",
      "name": "...",
      "description": "...",
      "credits": 4,
      "year": 2026,
      "semester": 2,
      "department": "...",
      "lecturer": "...",
      "assessment_structure": { ... },
      "learning_outcomes": [
        { "lo_code": "LO1", "bloom_level": "Understand", "bloom_verb": "interpret",
          "text": "...", "topic_keywords": [...] }
      ],
      "weekly_breakdown": [
        { "week_number": 1, "topic": "...", "subtopics": [...] }
      ]
    }
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).parent.parent
SEEDS_DIR = Path(__file__).parent / "modules"
sys.path.insert(0, str(BACKEND_DIR))


async def load_module(module_data: dict, reset: bool = False):
    """Upsert a single module from its seed dict."""
    from sqlalchemy import select, delete
    from app.core.database import async_session_factory
    from app.models import Module, LearningOutcome
    from app.models.module import Week

    async with async_session_factory() as db:
        code = module_data["code"]
        print(f"\n📦 Processing: {code} — {module_data['name']}")

        # ── Find or create Module ─────────────────────────────────────────────
        result = await db.execute(select(Module).where(Module.code == code))
        module = result.scalar_one_or_none()

        if module:
            print(f"   ↳ Module exists (id={module.id})")
            if reset:
                print(f"   ↳ --reset: clearing LOs and weeks...")
                await db.execute(delete(LearningOutcome).where(LearningOutcome.module_id == module.id))
                await db.execute(delete(Week).where(Week.module_id == module.id))
                await db.flush()
            # Update fields
            module.name = module_data["name"]
            module.description = module_data.get("description")
            module.credits = module_data.get("credits", 4)
            module.year = module_data.get("year", 2026)
            module.semester = module_data.get("semester", 1)
            module.department = module_data.get("department")
            module.lecturer = module_data.get("lecturer")
            module.assessment_structure = module_data.get("assessment_structure")
            module.outline_processed = True
        else:
            module = Module(
                code=code,
                name=module_data["name"],
                description=module_data.get("description"),
                credits=module_data.get("credits", 4),
                year=module_data.get("year", 2026),
                semester=module_data.get("semester", 1),
                department=module_data.get("department"),
                lecturer=module_data.get("lecturer"),
                assessment_structure=module_data.get("assessment_structure"),
                outline_processed=True,
            )
            db.add(module)
            await db.flush()
            print(f"   ↳ Created new module (id={module.id})")

        # ── Check if LOs already exist (skip if not resetting) ────────────────
        existing_lo_result = await db.execute(
            select(LearningOutcome).where(LearningOutcome.module_id == module.id)
        )
        existing_los = existing_lo_result.scalars().all()

        if existing_los and not reset:
            print(f"   ↳ {len(existing_los)} LOs already exist — skipping (use --reset to overwrite)")
        else:
            for lo_data in module_data.get("learning_outcomes", []):
                lo = LearningOutcome(
                    module_id=module.id,
                    lo_code=lo_data["lo_code"],
                    text=lo_data["text"],
                    bloom_level=lo_data["bloom_level"],
                    bloom_verb=lo_data.get("bloom_verb", ""),
                    topic_keywords=lo_data.get("topic_keywords", []),
                    assessment_weight=lo_data.get("assessment_weight"),
                )
                db.add(lo)
            print(f"   ↳ Inserted {len(module_data.get('learning_outcomes', []))} Learning Outcomes")

        # ── Check if weeks already exist ──────────────────────────────────────
        existing_weeks_result = await db.execute(
            select(Week).where(Week.module_id == module.id)
        )
        existing_weeks = existing_weeks_result.scalars().all()

        if existing_weeks and not reset:
            print(f"   ↳ {len(existing_weeks)} weeks already exist — skipping (use --reset to overwrite)")
        else:
            for week_data in module_data.get("weekly_breakdown", []):
                week = Week(
                    module_id=module.id,
                    week_number=week_data["week_number"],
                    topic=week_data["topic"],
                    subtopics=week_data.get("subtopics", []),
                    description=week_data.get("description", ""),
                )
                db.add(week)
            print(f"   ↳ Inserted {len(module_data.get('weekly_breakdown', []))} weeks")

        await db.commit()
        print(f"   ✅ {code} loaded successfully")


async def main():
    args = sys.argv[1:]
    reset = "--reset" in args
    filter_codes = [a.upper() for a in args if not a.startswith("--")]

    seed_files = sorted(SEEDS_DIR.glob("*.json"))
    if not seed_files:
        print(f"❌ No seed files found in {SEEDS_DIR}")
        print(f"   Add JSON files like: seeds/modules/SE4040_SecureSoftwareDevelopment.json")
        return

    print(f"🌱 LOA-ESS Module Seed Loader")
    print(f"   Seeds directory : {SEEDS_DIR}")
    print(f"   Files found     : {len(seed_files)}")
    print(f"   Filter          : {filter_codes if filter_codes else 'all'}")
    print(f"   Reset mode      : {'ON — existing LOs/weeks will be replaced' if reset else 'OFF'}")

    loaded = 0
    skipped = 0

    for seed_file in seed_files:
        try:
            data = json.loads(seed_file.read_text())
            code = data.get("code", "").upper()

            if filter_codes and code not in filter_codes:
                skipped += 1
                continue

            await load_module(data, reset=reset)
            loaded += 1

        except Exception as e:
            print(f"\n❌ Error loading {seed_file.name}: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*50}")
    print(f"✅ Done — {loaded} module(s) loaded, {skipped} skipped")
    print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main())

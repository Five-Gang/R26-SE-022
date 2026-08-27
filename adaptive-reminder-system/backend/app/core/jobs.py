from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.db.mongo import get_db
from app.services.scheduling import schedule_for_all_students

_scheduler = AsyncIOScheduler()

async def _run_scheduling_job() -> None:
    # Camera emotion is supplied by the frontend; never invent a default here.
    await schedule_for_all_students(get_db(), emotion=None)

def start_scheduler() -> None:
    if _scheduler.running:
        return
    _scheduler.add_job(
        _run_scheduling_job,
        trigger="interval",
        minutes=1,
        id="main_tick",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()

def stop_scheduler() -> None:
    if _scheduler.running:
        _scheduler.shutdown(wait=False)

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.scheduler import run_scheduling_tick_for_all_students

_scheduler = AsyncIOScheduler()

def start_scheduler() -> None:
    _scheduler.add_job(
        run_scheduling_tick_for_all_students,
        trigger="interval",
        minutes=1,
        id="main_tick",
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()

def stop_scheduler() -> None:
    _scheduler.shutdown(wait=False)

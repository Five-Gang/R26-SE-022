from apscheduler.schedulers.asyncio import AsyncIOScheduler
# from app.services.scheduler import run_scheduling_tick_for_all_students  # TODO: rebuild Model 3 (RL Scheduler)

_scheduler = AsyncIOScheduler()

def start_scheduler() -> None:
    # TODO: Rebuild Model 3 scheduler implementation
    # _scheduler.add_job(
    #     run_scheduling_tick_for_all_students,
    #     trigger="interval",
    #     minutes=1,
    #     id="main_tick",
    #     max_instances=1,
    #     coalesce=True,
    # )
    pass  # Scheduler will be re-enabled after rebuilding Model 3

def stop_scheduler() -> None:
    _scheduler.shutdown(wait=False)

const CONTENT_ROUTES = {
  ACTIVE_RECALL: { type: 'flashcards', cards: 15 },
  GUIDED_REVIEW: { type: 'summary', level: 'standard' },
  PASSIVE_READING: { type: 'summary', level: 'beginner' },
};

export function getReminderStudyRoute(reminder) {
  const moduleId = reminder?.module_id || (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reminder?.item_key || '')
      ? reminder.item_key
      : null
  );
  if (!moduleId) return null;

  const mode = CONTENT_ROUTES[reminder.content_type] || CONTENT_ROUTES.GUIDED_REVIEW;
  const params = new URLSearchParams({
    module: moduleId,
    type: mode.type,
  });

  if (reminder.week_number != null) {
    params.set('week', String(reminder.week_number));
  }
  if (reminder.topic || reminder.item_title) {
    params.set('query', reminder.topic || reminder.item_title);
  }
  if (mode.cards) {
    params.set('cards', String(mode.cards));
  }
  if (mode.level) {
    params.set('level', mode.level);
  }

  return `/study/generate?${params.toString()}`;
}

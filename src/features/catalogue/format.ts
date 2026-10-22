export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return seconds === 0
    ? `${minutes} min`
    : `${minutes} min ${String(seconds).padStart(2, '0')} s`;
}

export function formatResultCount(total: number): string {
  return `${total} ${total > 1 ? 'vidéos trouvées' : 'vidéo trouvée'}`;
}

const frenchLongDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

export function formatPublishedDate(isoDate: string): string {
  return frenchLongDateFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

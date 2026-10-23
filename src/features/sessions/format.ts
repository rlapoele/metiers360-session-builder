const frenchLongDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
  timeZone: 'UTC',
});

export function formatSessionDate(isoDateTime: string): string {
  return frenchLongDateFormatter.format(new Date(isoDateTime));
}

export function formatVideoCount(count: number): string {
  return `${count} ${count === 1 ? 'vidéo' : 'vidéos'}`;
}

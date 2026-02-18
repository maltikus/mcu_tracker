export const cn = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');

export const nowIso = (): string => new Date().toISOString();

export const episodeKey = (seasonNumber: number, episodeNumber: number): string =>
  `${seasonNumber}:${episodeNumber}`;

export const formatPercent = (value: number): string => `${Math.round(value)}%`;

export const formatDateTime = (iso?: string): string => {
  if (!iso) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));
};

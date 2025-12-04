/**
 * Format remaining time for rate limit messages
 * Returns format like "30 seconds", "1 minute 30 seconds", "2 minutes 15 seconds"
 * Always shows seconds when less than a minute, or minutes + seconds when more
 *
 * TODO: Translate time units (second, seconds, minute, minutes) using i18n
 * This requires adding translation keys: t.time.second, t.time.seconds, t.time.minute, t.time.minutes
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }

  const minutesStr = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const secondsStr = `${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`;
  return `${minutesStr} ${secondsStr}`;
}

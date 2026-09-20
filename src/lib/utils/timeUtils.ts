/**
 * ⏰ TIME UTILITIES FOR DAILY QUOTA LIFECYCLES
 */

/**
 * Calculates remaining hours and minutes until next 00:00 (midnight) in user's local timezone.
 */
export function getTimeUntilLocalMidnight(): { hours: number; minutes: number; formatted: string } {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Midnight in user's local device timezone
  
  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  const formatted = `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return { hours, minutes, formatted };
}

/**
 * Returns today's local date string in YYYY-MM-DD format.
 */
export function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

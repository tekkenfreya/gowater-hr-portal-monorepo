/**
 * Timezone utility for consistent time display
 * All times are displayed in Philippine Time (Asia/Manila, UTC+8)
 */

const PHILIPPINE_TIMEZONE = 'Asia/Manila';

/**
 * Format a date/time string to Philippine Time
 * @param dateString - ISO date string from database
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted time string in Philippine Time
 */
export function formatPhilippineTime(
  dateString: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '--';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      timeZone: PHILIPPINE_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...options
    };

    return date.toLocaleTimeString('en-US', defaultOptions);
  } catch {
    return '--';
  }
}

/**
 * Format a date to Philippine Time with date and time
 * @param dateString - ISO date string from database
 * @returns Formatted date and time string in Philippine Time
 */
export function formatPhilippineDateTime(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '--';

    return date.toLocaleString('en-US', {
      timeZone: PHILIPPINE_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '--';
  }
}

/**
 * Format a date to Philippine Time (date only)
 * @param dateString - ISO date string from database
 * @returns Formatted date string in Philippine Time
 */
export function formatPhilippineDate(dateString: string | Date): string {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '--';

    return date.toLocaleDateString('en-US', {
      timeZone: PHILIPPINE_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '--';
  }
}

/**
 * Get the current time in Philippine timezone
 * @returns Date object representing current Philippine time
 */
export function getCurrentPhilippineTime(): Date {
  // Get current time and convert to Philippine timezone
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: PHILIPPINE_TIMEZONE }));
  return phTime;
}

/**
 * Get the hour in Philippine timezone from a date string
 * @param dateString - ISO date string
 * @returns Hour (0-23) in Philippine timezone
 */
export function getPhilippineHour(dateString: string | Date): number {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  const phTimeString = date.toLocaleString('en-US', {
    timeZone: PHILIPPINE_TIMEZONE,
    hour: 'numeric',
    hour12: false
  });

  return parseInt(phTimeString);
}

/**
 * Check if a time is late (after 10 AM Philippine Time)
 * @param dateString - ISO date string of check-in time
 * @returns true if check-in is after 10 AM Philippine Time
 */
export function isLateCheckIn(dateString: string | Date): boolean {
  const hour = getPhilippineHour(dateString);
  return hour >= 10;
}

/**
 * Get today's date in Philippine timezone as YYYY-MM-DD format
 * This is crucial for attendance records to use consistent dates
 * @returns Date string in YYYY-MM-DD format (Philippine timezone)
 */
export function getPhilippineDateString(date?: Date): string {
  const d = date || new Date();

  // Get the date parts in Philippine timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PHILIPPINE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  // en-CA locale gives us YYYY-MM-DD format
  return formatter.format(d);
}

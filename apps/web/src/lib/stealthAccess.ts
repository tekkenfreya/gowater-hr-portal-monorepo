const STEALTH_USER_IDS: readonly number[] = [1];

export function hasStealthAttendanceAccess(userId: number | undefined | null): boolean {
  return typeof userId === 'number' && STEALTH_USER_IDS.includes(userId);
}

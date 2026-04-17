const STEALTH_USER_IDS: readonly number[] = [1];

// Emails that can perform unit management (status changes, delete, create)
// without needing the 'admin' role.
const UNIT_MANAGE_ALLOW_EMAILS: readonly string[] = ['edson@amplify11.com'];

export function hasStealthAttendanceAccess(userId: number | undefined | null): boolean {
  return typeof userId === 'number' && STEALTH_USER_IDS.includes(userId);
}

/**
 * True if the caller can manage units: change status (dispatch, decommission,
 * verified), delete, create, bulk-import. Everyone else can still view/edit
 * non-status fields (model, destination, notes).
 */
export function hasUnitManageAccess(
  role: string | undefined | null,
  email: string | undefined | null,
): boolean {
  if (role === 'admin') return true;
  if (email && UNIT_MANAGE_ALLOW_EMAILS.includes(email.toLowerCase())) return true;
  return false;
}

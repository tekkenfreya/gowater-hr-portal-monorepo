const PG_CODES: Record<string, string> = {
  '23502': 'Required field is missing',
  '23505': 'This value already exists and must be unique',
  '23503': 'Referenced record does not exist',
  '23514': 'Value is not allowed (check constraint failed)',
  '22P02': 'Value is not the correct type for this field',
  '22007': 'Date/time value is not valid',
  '22008': 'Date/time value is out of range',
  '42703': 'Field does not exist in the database',
  '42P01': 'Table does not exist',
};

interface MaybePgError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
  column?: string;
}

export function describeDbError(err: unknown, context: string): string {
  const e = err as MaybePgError | null;
  if (!e || typeof e !== 'object') return `${context}: unexpected error`;

  const friendly = e.code ? PG_CODES[e.code] : null;
  const column = extractColumn(e);

  if (friendly && column) return `${context}: ${friendly} (field: ${column})`;
  if (friendly) return `${context}: ${friendly}`;
  if (column) return `${context}: problem with field ${column} — ${e.message || 'unknown'}`;
  return `${context}: ${e.message || 'unknown error'}`;
}

function extractColumn(e: MaybePgError): string | null {
  if (e.column) return e.column;
  const msg = e.message || '';
  const details = e.details || '';

  const quotedCol =
    msg.match(/column "([^"]+)"/i) ||
    details.match(/column "([^"]+)"/i) ||
    msg.match(/Key \(([^)]+)\)/i);
  if (quotedCol?.[1]) return quotedCol[1];

  return null;
}

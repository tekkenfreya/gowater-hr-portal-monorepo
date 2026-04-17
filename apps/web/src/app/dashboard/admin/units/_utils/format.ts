export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatUnitType(type: string): string {
  return type === 'vending_machine' ? 'Vending Machine' : 'Dispenser';
}

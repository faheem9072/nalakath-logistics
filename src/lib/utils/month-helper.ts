/**
 * Month helpers for fleet dashboards and date filtering
 */

export function getCurrentMonthPrefix(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface MonthOption {
  value: string;
  label: string;
}

export function getAvailableMonthOptions(): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();

  // Generate options starting from 1 month ahead to 12 months in the past
  for (let i = -1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!options.some((o) => o.value === value)) {
      options.push({ value, label });
    }
  }

  // Prepend All Time so users can view all history across all months anytime
  return [{ value: 'ALL', label: 'All History (All Months)' }, ...options];
}


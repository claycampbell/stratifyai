/**
 * Formats a number value with proper currency symbol placement and comma separators
 * @param value - The numeric value to format
 * @param unit - The unit (e.g., '$', '%', 'users')
 * @returns Formatted string with proper symbol placement
 */
export function formatKPIValue(value: number | string | null | undefined, unit?: string | null): string {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return 'N/A';
  }

  // Format number with commas
  const formattedNumber = numValue.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  // Handle currency symbols that should go before the number
  if (unit) {
    const currencySymbols = ['$', '£', '€', '¥'];
    const trimmedUnit = unit.trim();

    if (currencySymbols.includes(trimmedUnit)) {
      return `${trimmedUnit}${formattedNumber}`;
    }

    // For all other units (%, users, etc.), place after the number
    return `${formattedNumber} ${trimmedUnit}`;
  }

  return formattedNumber;
}

/**
 * Formats a KPI value pair (current/target) with proper formatting
 * @param currentValue - Current value
 * @param targetValue - Target value
 * @param unit - Unit of measurement
 * @returns Formatted string like "$1,234 / $5,000"
 */
export function formatKPIValuePair(
  currentValue: number | string | null | undefined,
  targetValue: number | string | null | undefined,
  unit?: string | null
): string {
  const formattedCurrent = formatKPIValue(currentValue, unit);
  const formattedTarget = formatKPIValue(targetValue, unit);
  return `${formattedCurrent} / ${formattedTarget}`;
}

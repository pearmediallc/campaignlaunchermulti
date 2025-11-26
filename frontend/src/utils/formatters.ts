/**
 * Formatting Utilities
 *
 * Consistent formatting functions for displaying metrics
 * with proper decimal places across all components.
 */

/**
 * Format currency values with 2 decimal places
 * @param value - Numeric value to format
 * @returns Formatted currency string (e.g., "$123.45")
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return '—';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '—';
  }

  return `$${numValue.toFixed(2)}`;
};

/**
 * Format percentage values with 2 decimal places
 * @param value - Numeric value to format
 * @returns Formatted percentage string (e.g., "12.34%")
 */
export const formatPercentage = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return '—';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '—';
  }

  return `${numValue.toFixed(2)}%`;
};

/**
 * Format whole numbers with thousands separators
 * @param value - Numeric value to format
 * @returns Formatted number string (e.g., "1,234")
 */
export const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return '—';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '—';
  }

  return Math.round(numValue).toLocaleString();
};

/**
 * Format frequency with 2 decimal places
 * @param value - Numeric value to format
 * @returns Formatted frequency string (e.g., "1.25")
 */
export const formatFrequency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return '—';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '—';
  }

  return numValue.toFixed(2);
};

/**
 * Format budget values (handles both cents and dollars)
 * Facebook API returns budget in cents, so we divide by 100
 * @param value - Budget value (can be string or number, in cents or dollars)
 * @returns Formatted budget string (e.g., "$50.00")
 */
export const formatBudget = (value: string | number | null | undefined): string => {
  if (!value || value === '0') {
    return '—';
  }

  let numValue: number;

  if (typeof value === 'string') {
    numValue = parseFloat(value);
  } else {
    numValue = value;
  }

  if (isNaN(numValue)) {
    return '—';
  }

  // If value is greater than 1000, assume it's in cents and convert to dollars
  if (numValue > 1000) {
    numValue = numValue / 100;
  }

  return formatCurrency(numValue);
};

/**
 * Format rate values (like CTR) with 4 decimal places for precision
 * @param value - Numeric value to format
 * @returns Formatted rate string (e.g., "0.1234")
 */
export const formatRate = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return '—';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '—';
  }

  return numValue.toFixed(4);
};

/**
 * Format decimal values with specified precision
 * @param value - Numeric value to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted decimal string
 */
export const formatDecimal = (
  value: number | string | null | undefined,
  decimals: number = 2
): string => {
  if (value === null || value === undefined || value === '' || isNaN(Number(value))) {
    return '—';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '—';
  }

  return numValue.toFixed(decimals);
};

/**
 * Safe number parsing that returns 0 for invalid values
 * @param value - Value to parse
 * @returns Parsed number or 0
 */
export const safeParseNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);

  return isNaN(numValue) ? 0 : numValue;
};

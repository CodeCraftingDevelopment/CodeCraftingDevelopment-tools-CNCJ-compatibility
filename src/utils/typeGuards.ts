import { AccountMetadata } from '../types/accounts';

/**
 * Safely converts Record<string, unknown> to AccountMetadata
 * Filters and coerces values to valid AccountMetadata types
 */
export function toAccountMetadata(data: Record<string, unknown>): AccountMetadata {
  const result: AccountMetadata = {};
  for (const [key, val] of Object.entries(data)) {
    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean' || val === null) {
      result[key] = val;
    } else if (val !== undefined) {
      // Convert other types to string for compatibility
      result[key] = String(val);
    }
  }
  return result;
}

/**
 * Type guard to check if a value is a valid AccountMetadata value
 */
export function isValidAccountMetadataValue(value: unknown): value is string | number | boolean | null {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null;
}

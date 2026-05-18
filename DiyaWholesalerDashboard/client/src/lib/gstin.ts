/** Indian GSTIN: 15 characters — state code, PAN, entity, Z, checksum. */
export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const GSTIN_INVALID_MESSAGE = "Enter a valid GSTIN";

/** Trim whitespace and normalize to uppercase for storage and validation. */
export function normalizeGstin(value: string): string {
  return value.trim().toUpperCase();
}

/** Empty GSTIN is valid (optional field). Returns an error message when invalid. */
export function getGstinValidationError(value: string): string {
  const normalized = normalizeGstin(value);
  if (!normalized) return "";
  if (!GSTIN_REGEX.test(normalized)) return GSTIN_INVALID_MESSAGE;
  return "";
}

export function isGstinValid(value: string): boolean {
  return getGstinValidationError(value) === "";
}

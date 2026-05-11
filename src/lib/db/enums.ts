export const ROLES = ["ADMIN", "MEMBER", "CHILD"] as const;
export type Role = (typeof ROLES)[number];

export const SOURCE_TYPES = ["MANUAL", "WEB", "OCR", "HANDWRITTEN", "AI"] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isSourceType(value: string): value is SourceType {
  return (SOURCE_TYPES as readonly string[]).includes(value);
}

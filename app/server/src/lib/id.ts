import { nanoid } from "nanoid";

/** Generate a 12-character URL-safe public ID */
export function generateId(): string {
  return nanoid(12);
}

/** Generate an 8-character short code for affiliate links */
export function generateShortCode(): string {
  return nanoid(8);
}

/** Generate a 32-character API key */
export function generateApiKey(): string {
  return `ascnd_${nanoid(32)}`;
}

import type { Claim } from "@/lib/types";
import {
  sanitizeCitationId,
  sanitizeModelText,
} from "@/lib/security/sanitize";

export function sanitizeStatementText(input: string, max = 600): string {
  return sanitizeModelText(input, max);
}

export function sanitizeClaims(
  claims: { kind: Claim["kind"]; text: string; sourceIds?: string[] }[],
): Claim[] {
  return claims
    .map((c) => ({
      kind: c.kind,
      text: sanitizeStatementText(c.text, 600),
      sourceIds: (c.sourceIds ?? [])
        .map(sanitizeCitationId)
        .filter((id) => id.length > 0),
    }))
    .filter((c) => c.text.length > 0);
}

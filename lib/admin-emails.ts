import { loadMarkerCollection } from "@/lib/storage";

export const SUPER_ADMIN_EMAIL = "redacted@example.com";

function parseBootstrapEmails(rawValue: string | undefined): string[] {
  return (rawValue ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeEmails(emails: string[]): string[] {
  return Array.from(
    new Set(
      emails
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function isSuperAdminEmail(email?: string | null): boolean {
  return (email ?? "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

export async function getAllowedAdminEmails(): Promise<string[]> {
  const collection = await loadMarkerCollection();
  return normalizeEmails([
    ...collection.adminEmails,
    ...parseBootstrapEmails(process.env.ADMIN_GOOGLE_EMAILS),
  ]);
}

export async function isAllowedAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) {
    return false;
  }

  const normalized = email.trim().toLowerCase();

  if (isSuperAdminEmail(normalized)) {
    return true;
  }

  const allowedEmails = await getAllowedAdminEmails();
  return allowedEmails.includes(normalized);
}

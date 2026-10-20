import { loadMarkerCollection } from "@/lib/storage";

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
  const superAdminEmail = process.env.SUPER_ADMIN_GOOGLE_EMAIL?.trim().toLowerCase();
  return Boolean(superAdminEmail && email?.trim().toLowerCase() === superAdminEmail);
}

export function getMergedAdminEmails(persistedAdminEmails: string[]): string[] {
  return normalizeEmails([
    ...persistedAdminEmails,
    ...parseBootstrapEmails(process.env.ADMIN_GOOGLE_EMAILS),
  ]);
}

export async function getAllowedAdminEmails(): Promise<string[]> {
  const collection = await loadMarkerCollection();
  return getMergedAdminEmails(collection.adminEmails);
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

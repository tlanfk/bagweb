import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import type { MarkerCollection } from "@/lib/types";
import {
  getAllowedAdminEmails,
  getMergedAdminEmails,
  isSuperAdminEmail,
} from "@/lib/admin-emails";

export { isAllowedAdminEmail } from "@/lib/admin-emails";

export interface AccessContext {
  email: string | null;
  isSignedIn: boolean;
  canEdit: boolean;
  isSuperAdmin: boolean;
  adminEmails: string[];
}

function normalizeEmail(email?: string | null): string | null {
  return email?.trim().toLowerCase() ?? null;
}

export function buildAccessContext(
  email: string | null,
  persistedAdminEmails: MarkerCollection["adminEmails"],
): AccessContext {
  const normalizedEmail = normalizeEmail(email);
  const adminEmails = getMergedAdminEmails(persistedAdminEmails);
  const isSuperAdmin = isSuperAdminEmail(normalizedEmail);

  return {
    email: normalizedEmail,
    isSignedIn: Boolean(normalizedEmail),
    canEdit: isSuperAdmin || (normalizedEmail ? adminEmails.includes(normalizedEmail) : false),
    isSuperAdmin,
    adminEmails: isSuperAdmin ? adminEmails : [],
  };
}

export async function getSessionEmail(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return normalizeEmail(session?.user?.email);
  } catch {
    return null;
  }
}

export async function getServerAccessContext(
  collection?: Pick<MarkerCollection, "adminEmails">,
): Promise<AccessContext> {
  try {
    const email = await getSessionEmail();

    if (collection) {
      return buildAccessContext(email, collection.adminEmails);
    }

    const adminEmails = await getAllowedAdminEmails();
    const isSuperAdmin = isSuperAdminEmail(email);

    return {
      email,
      isSignedIn: Boolean(email),
      canEdit: isSuperAdmin || (email ? adminEmails.includes(email) : false),
      isSuperAdmin,
      adminEmails: isSuperAdmin ? adminEmails : [],
    };
  } catch {
    return buildAccessContext(null, []);
  }
}

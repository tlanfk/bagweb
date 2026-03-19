import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getAllowedAdminEmails, isAllowedAdminEmail, isSuperAdminEmail } from "@/lib/admin-emails";

export { isAllowedAdminEmail } from "@/lib/admin-emails";

export interface AccessContext {
  email: string | null;
  isSignedIn: boolean;
  canEdit: boolean;
  isSuperAdmin: boolean;
  adminEmails: string[];
}

export async function getServerAccessContext(): Promise<AccessContext> {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase() ?? null;
    const adminEmails = await getAllowedAdminEmails();

    return {
      email,
      isSignedIn: Boolean(email),
      canEdit: await isAllowedAdminEmail(email),
      isSuperAdmin: isSuperAdminEmail(email),
      adminEmails,
    };
  } catch {
    return {
      email: null,
      isSignedIn: false,
      canEdit: false,
      isSuperAdmin: false,
      adminEmails: [],
    };
  }
}

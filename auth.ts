import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const sessionCookieName =
  process.env.NODE_ENV === "production"
    ? "__Secure-bag-google-admin.session-token"
    : "bag-google-admin.session-token";

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const googleClientId =
  process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_ID ?? "";
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_SECRET ?? "";

export const authOptions: NextAuthOptions = {
  secret: authSecret,
  debug: process.env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  pages: {
    signIn: "/admin",
    error: "/admin",
  },
  logger: {
    error(code, metadata) {
      console.error("[next-auth][error]", code, metadata);
    },
    warn(code) {
      console.warn("[next-auth][warn]", code);
    },
    debug(code, metadata) {
      console.debug("[next-auth][debug]", code, metadata);
    },
  },
};

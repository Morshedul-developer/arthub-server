import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

export function createAuth(authDb) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleEnabled =
    googleClientId &&
    googleClientSecret &&
    !googleClientId.startsWith("add_") &&
    !googleClientSecret.startsWith("add_");

  return betterAuth({
    database: mongodbAdapter(authDb),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [process.env.CLIENT_URL || "http://localhost:3000"],
    emailAndPassword: {
      enabled: true
    },
    socialProviders: googleEnabled
      ? { google: { clientId: googleClientId, clientSecret: googleClientSecret } }
      : {}
  });
}

import { SignJWT, jwtVerify } from "jose-cjs";

function getSecret() {
  const raw = process.env.BETTER_AUTH_SECRET;
  if (!raw) throw new Error("BETTER_AUTH_SECRET is not set");
  return new TextEncoder().encode(raw);
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}

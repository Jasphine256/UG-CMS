import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  sessionId: string;
}

export function signAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: { userId: string; sessionId: string }): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

export function verifyRefreshToken(token: string): { userId: string; sessionId: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; sessionId: string };
}

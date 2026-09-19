import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export const COOKIE_NAME = 'obliq_session';
const JWT_SECRET = process.env.JWT_SECRET || 'obliq_fallback_secret_key_change_in_prod';
const key = new TextEncoder().encode(JWT_SECRET);

export interface SessionPayload {
  userId: string;
  firmId: string;
  role: Role;
}

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Password Hashing & Verification
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * JWT Token Signing & Verification
 */
export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return {
      userId: payload.userId as string,
      firmId: payload.firmId as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/**
 * Helper: getSessionOrThrow(req)
 * Decodes and verifies the JWT stored in the httpOnly cookie.
 * Throws an AuthError (401) if missing, invalid, or expired.
 */
export async function getSessionOrThrow(req: NextRequest): Promise<SessionPayload> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    throw new AuthError('Authentication required. Missing session cookie.', 401);
  }

  const session = await verifyToken(token);
  if (!session) {
    throw new AuthError('Session invalid or expired. Please log in again.', 401);
  }

  return session;
}

/**
 * Helper: requireRole(session, allowedRoles)
 * Throws an AuthError (403) if the session role is not authorized for the action.
 */
export function requireRole(session: SessionPayload, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(session.role)) {
    throw new AuthError(
      `Forbidden: Your role (${session.role}) does not have permission to perform this action.`,
      403
    );
  }
}

/**
 * Response Helpers for Setting and Clearing HTTP-Only Cookies
 */
export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

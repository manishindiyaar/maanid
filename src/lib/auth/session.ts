import { sign, verify, SignOptions } from 'jsonwebtoken';
import { cookies } from 'next/headers';

interface SessionUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

interface SessionPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Create a signed JWT session token
 */
export function createSessionToken(user: SessionUser, expiresIn: string = '7d'): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or NEXTAUTH_SECRET not configured');
  }

  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  // Using any to bypass type constraint - the API actually accepts string values like '7d'
  const signOptions: SignOptions = { expiresIn: expiresIn as any };
  
  return sign(payload, secret, signOptions);
}

/**
 * Verify and decode a session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('JWT_SECRET or NEXTAUTH_SECRET not configured');
      return null;
    }

    const decoded = verify(token, secret) as SessionPayload;
    return decoded;
  } catch (error) {
    console.error('Failed to verify session token:', error);
    return null;
  }
}

/**
 * Set session token as HttpOnly cookie
 */
export function setSessionCookie(token: string): void {
  const cookieStore = cookies();
  
  // Set HTTP-only cookie with same-site and secure flags
  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
}

/**
 * Get current session from cookies
 */
export function getSessionFromCookies(): SessionPayload | null {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  
  if (!sessionToken) {
    return null;
  }
  
  return verifySessionToken(sessionToken);
}

/**
 * Create session token and set as cookie
 */
export function createAndSetSession(user: SessionUser): string {
  const token = createSessionToken(user);
  setSessionCookie(token);
  return token;
}

/**
 * Clear session token cookie
 */
export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.set('session_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  });
} 
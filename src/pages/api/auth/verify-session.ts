import { NextApiRequest, NextApiResponse } from 'next';
import { cookies } from 'next/headers';
import { verify as verifyJwt } from 'jsonwebtoken';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

interface SessionPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

/**
 * API endpoint to verify a session token and return user information
 * 
 * This is called by getSupabaseClient when session-based auth is used
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from cookie in the request
    const sessionToken = req.cookies['session_token'];
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'No session token found' });
    }

    // Verify JWT token
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error('JWT_SECRET or NEXTAUTH_SECRET not configured');
      return res.status(500).json({ error: 'Server not properly configured' });
    }

    try {
      // Verify and decode token
      const decoded = verifyJwt(sessionToken, secret) as SessionPayload;
      
      // Check if token is expired
      if (decoded.exp * 1000 < Date.now()) {
        return res.status(401).json({ error: 'Session expired' });
      }

      // Check if user exists in admin database
      const supabase = createAdminSupabaseClient();
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      // Return user info
      return res.status(200).json({
        userId: user.id,
        email: user.email,
        role: user.role || decoded.role || 'user'
      });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
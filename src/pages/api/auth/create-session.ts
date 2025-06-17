import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionToken } from '@/lib/auth/session';
import { serialize } from 'cookie';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

/**
 * API endpoint to create a secure session token
 * 
 * This is called after successful authentication to create a JWT session
 * token that is stored as an HTTP-only cookie.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, role } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the user exists in the database
    const supabase = createAdminSupabaseClient();
    
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        console.error('Error verifying user:', error);
        return res.status(401).json({ error: 'Invalid user' });
      }
      
      // User exists, create session token
      const token = createSessionToken({
        id: userId,
        email,
        role: role || 'user'
      });

      // Set token as HTTP-only cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      };

      // Add domain for production
      if (process.env.NODE_ENV === 'production') {
        const hostname = req.headers.host || '';
        const isProd = hostname.includes('bladexlab.com');
        
        if (isProd) {
          Object.assign(cookieOptions, {
            domain: '.bladexlab.com'
          });
        }
      }

      // Set cookie in response
      res.setHeader('Set-Cookie', serialize('session_token', token, cookieOptions));

      // Also update the user record with role if needed
      if (role) {
        await supabase
          .from('users')
          .update({ role })
          .eq('id', userId);
      }

      return res.status(200).json({ success: true });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to verify user' });
    }
  } catch (error) {
    console.error('Session creation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
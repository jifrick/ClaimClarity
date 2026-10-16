import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../services/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// Standard UUID regex (8-4-4-4-12 hex format)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const supabase = getSupabase();

  // 1. Production / Live Supabase Auth verification
  if (supabase && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.user = {
        id: user.id,
        email: user.email || 'user@example.com',
        displayName: user.user_metadata?.display_name || user.email || 'Claimant',
      };
      return next();
    }
    // If Supabase is configured and token verification fails, reject immediately
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication credentials.',
    });
  }

  // 2. Strict development/test mode restrictions
  if (process.env.NODE_ENV === 'production') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid authentication credentials required.',
    });
  }

  // 3. In non-production, check for simulated test user header (requires valid UUID format)
  const demoUserId = req.headers['x-demo-user-id'] as string;
  if (demoUserId && UUID_REGEX.test(demoUserId)) {
    req.user = {
      id: demoUserId,
      email: `${demoUserId}@test.claimclarity.in`,
      displayName: 'Simulated Policyholder',
    };
    return next();
  }

  // 4. Default demo user token strictly in dev/test environment
  if (authHeader === 'Bearer demo-token') {
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'rajesh.sharma@example.in',
      displayName: 'Rajesh Sharma (Verified Policyholder)',
    };
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Valid authentication credentials required to access this resource.',
  });
}

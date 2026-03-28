import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Verifies JWT and attaches req.user { id, role, email }.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET missing');
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/** Allow only listed roles */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

/** Optional: load full user doc when needed */
export async function attachUser(req, res, next) {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(401).json({ message: 'User not found' });
    req.userDoc = u;
    next();
  } catch (e) {
    next(e);
  }
}

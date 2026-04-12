import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { signToken } from '../utils/token.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const registerValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email required')
    .customSanitizer((value) => String(value).trim().toLowerCase()),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
  body('role').isIn(['patient', 'doctor']).withMessage('Role must be patient or doctor'),
  body('specialization')
    .if(body('role').equals('doctor'))
    .trim()
    .notEmpty()
    .withMessage('Specialization required for doctors'),
];

/**
 * POST /api/auth/register — patients and doctors only (admin via seed script).
 */
router.post('/register', registerValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
  }
  const { name, email, password, role, phone, specialization, experienceYears, bio } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      phone: phone || '',
    });
    if (role === 'doctor') {
      await DoctorProfile.create({
        user: user._id,
        specialization,
        experienceYears: Number(experienceYears) || 0,
        bio: bio || '',
        availableSlots: [],
      });
    }
    const token = signToken(user);
    const userJson = user.toJSON();
    return res.status(201).json({ token, user: userJson });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty()
      .isEmail()
      .customSanitizer((value) => String(value).trim().toLowerCase()),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { email, password } = req.body;
    const lowerEmail = String(email || '').trim().toLowerCase();
    try {
      console.log(`[auth] Login attempt: ${lowerEmail}`);
      const user = await User.findOne({ email: lowerEmail }).select('+passwordHash');
      if (!user) {
        console.log(`[auth] User not found: ${lowerEmail}`);
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        console.log(`[auth] Password mismatch for: ${lowerEmail}`);
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      console.log(`[auth] Login success: ${lowerEmail} (role: ${user.role})`);
      const token = signToken(user);
      const userJson = user.toJSON();
      return res.json({ token, user: userJson });
    } catch (e) {
      console.error('[auth] Login error:', e);
      return res.status(500).json({ message: 'Login failed' });
    }
  }
);

/** Current user (optional helper for frontend) */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user: user.toJSON() });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load user' });
  }
});

export default router;

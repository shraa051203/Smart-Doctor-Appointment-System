import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, param, query, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/doctors — list doctors; optional ?specialization=...
 */
router.get(
  '/',
  [query('specialization').optional().trim()],
  async (req, res) => {
    try {
      const filter = {};
      if (req.query.specialization) {
        filter.specialization = new RegExp(req.query.specialization, 'i');
      }
      const profiles = await DoctorProfile.find(filter)
        .populate('user', 'name email phone')
        .sort({ specialization: 1, createdAt: -1 })
        .lean();
      const list = profiles.map((p) => ({
        _id: p._id,
        userId: p.user?._id,
        name: p.user?.name,
        email: p.user?.email,
        phone: p.user?.phone,
        specialization: p.specialization,
        experienceYears: p.experienceYears,
        bio: p.bio,
        availableSlots: p.availableSlots,
      }));
      return res.json({ doctors: list });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Failed to list doctors' });
    }
  }
);

/**
 * GET /api/doctors/profile/me — must be before /:id
 */
router.get('/profile/me', authenticate, authorize('doctor'), async (req, res) => {
  try {
    const profile = await DoctorProfile.findOne({ user: req.user.id })
      .populate('user', 'name email phone')
      .lean();
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    return res.json({
      doctor: {
        _id: profile._id,
        userId: profile.user?._id,
        name: profile.user?.name,
        email: profile.user?.email,
        specialization: profile.specialization,
        experienceYears: profile.experienceYears,
        bio: profile.bio,
        availableSlots: profile.availableSlots,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load profile' });
  }
});

/**
 * PUT /api/doctors/availability/me
 */
router.put(
  '/availability/me',
  authenticate,
  authorize('doctor'),
  [
    body('slots')
      .isArray()
      .withMessage('slots must be an array')
      .custom((arr) => {
        if (!Array.isArray(arr)) return false;
        return arr.every(
          (d) =>
            d &&
            typeof d.date === 'string' &&
            /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
            Array.isArray(d.slots) &&
            d.slots.every((t) => typeof t === 'string' && /^\d{2}:\d{2}$/.test(t))
        );
      })
      .withMessage('Each item: { date: YYYY-MM-DD, slots: [HH:mm] }'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    try {
      const profile = await DoctorProfile.findOne({ user: req.user.id });
      if (!profile) return res.status(404).json({ message: 'Doctor profile not found' });
      profile.availableSlots = req.body.slots.map((s) => ({
        date: s.date,
        slots: [...new Set(s.slots)].sort(),
      }));
      await profile.save();
      return res.json({
        message: 'Availability updated',
        availableSlots: profile.availableSlots,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Failed to update availability' });
    }
  }
);

/**
 * GET /api/doctors/:id — doctor profile by DoctorProfile _id
 */
router.get('/:id', [param('id').isMongoId()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Invalid id', errors: errors.array() });
  }
  try {
    const profile = await DoctorProfile.findById(req.params.id)
      .populate('user', 'name email phone')
      .lean();
    if (!profile) return res.status(404).json({ message: 'Doctor not found' });
    return res.json({
      doctor: {
        _id: profile._id,
        userId: profile.user?._id,
        name: profile.user?.name,
        email: profile.user?.email,
        phone: profile.user?.phone,
        specialization: profile.specialization,
        experienceYears: profile.experienceYears,
        bio: profile.bio,
        availableSlots: profile.availableSlots,
      },
    });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load doctor' });
  }
});

/**
 * POST /api/doctors — admin only: create doctor user + profile
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('name').trim().notEmpty(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('specialization').trim().notEmpty(),
    body('experienceYears').optional().isInt({ min: 0 }),
    body('bio').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { name, email, password, specialization, experienceYears, bio, phone } = req.body;
    try {
      if (await User.findOne({ email })) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: 'doctor',
        phone: phone || '',
      });
      const profile = await DoctorProfile.create({
        user: user._id,
        specialization,
        experienceYears: Number(experienceYears) || 0,
        bio: bio || '',
        availableSlots: [],
      });
      return res.status(201).json({
        message: 'Doctor created',
        doctor: {
          profileId: profile._id,
          userId: user._id,
          name: user.name,
          email: user.email,
          specialization: profile.specialization,
        },
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Failed to create doctor' });
    }
  }
);

export default router;

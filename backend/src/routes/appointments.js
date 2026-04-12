import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Appointment } from '../models/Appointment.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { User } from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendAppointmentBookedEmail } from '../utils/email.js';
import { parseAppointmentRequest, findAvailableSlot } from '../utils/aiParser.js';

const router = Router();

// Custom validation for date and time
const validateDateTime = (value, { req }) => {
  const date = req.body.date;
  const time = req.body.time;
  if (!date || !time) return true; // Let other validators handle missing values

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5); // HH:mm

  if (date < today) {
    throw new Error('Cannot book appointment for past date/time');
  }

  if (date === today && time <= currentTime) {
    throw new Error('Cannot book appointment for past date/time');
  }

  return true;
};

function slotAvailableOnProfile(profile, date, time) {
  const day = profile.availableSlots?.find((d) => d.date === date);
  return day?.slots?.includes(time);
}

function normalizeTimeValue(timeText) {
  if (!timeText) return null;
  const m = String(timeText).toLowerCase().trim().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  let hour = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ampm = m[3];
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function normalizeDateText(dateText) {
  if (!dateText) return null;
  const now = new Date();
  const raw = String(dateText).toLowerCase().trim();
  if (raw === 'today') return now.toISOString().split('T')[0];
  if (raw === 'tomorrow') {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + 1);
    return dt.toISOString().split('T')[0];
  }
  if (raw === 'day after tomorrow') {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + 2);
    return dt.toISOString().split('T')[0];
  }
  const exact = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if (exact) return exact[1];
  return null;
}

/**
 * POST /api/appointments/book — patient only
 */
router.post(
  '/book',
  authenticate,
  authorize('patient'),
  [
    body('doctorProfileId').isMongoId(),
    body('date').matches(/^\d{4}-\d{2}-\d{2}$/),
    body('time').matches(/^\d{2}:\d{2}$/),
    body('notes').optional().trim(),
    body().custom(validateDateTime),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    const { doctorProfileId, date, time, notes } = req.body;
    try {
      const profile = await DoctorProfile.findById(doctorProfileId).populate('user');
      if (!profile || !profile.user) {
        return res.status(404).json({ message: 'Doctor not found' });
      }
      if (!slotAvailableOnProfile(profile, date, time)) {
        return res.status(400).json({ message: 'Selected slot is not available' });
      }
      const doctorUserId = profile.user._id;
      const appt = await Appointment.create({
        patient: req.user.id,
        doctor: doctorUserId,
        date,
        time,
        notes: notes || '',
        status: 'pending',
      });
      const populated = await Appointment.findById(appt._id)
        .populate('patient', 'name email')
        .populate('doctor', 'name email')
        .lean();
      const patientDoc = await User.findById(req.user.id);
      if (patientDoc?.email) {
        sendAppointmentBookedEmail({
          to: patientDoc.email,
          patientName: patientDoc.name,
          doctorName: profile.user.name,
          date,
          time,
        }).catch((err) => console.error('[email]', err));
      }
      return res.status(201).json({ appointment: populated });
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ message: 'This time slot is already booked' });
      }
      console.error(e);
      return res.status(500).json({ message: 'Booking failed' });
    }
  }
);

/**
 * POST /api/appointments/book-ai — AI-powered natural language booking (patient only)
 * Body: { message: "Book appointment with Dr. Sharma tomorrow at 5pm" }
 */
router.post(
  '/book-ai',
  authenticate,
  authorize('patient'),
  [
    body('message').isString().trim().notEmpty().withMessage('Message is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { message } = req.body;

    try {
      // ── Step 1: Parse natural language ──────────────────────────────────
      console.log('[AI Booking] Parsing message:', message);
      let parsed;
      try {
        parsed = await parseAppointmentRequest(message);
      } catch (parseError) {
        console.error('[AI Booking] Parse error:', parseError.message);
        return res.status(400).json({
          success: false,
          message: parseError.message,
          error: 'PARSE_FAILED',
          hint: 'Try: "Book appointment with Dr. Sharma tomorrow at 5pm"',
        });
      }
      console.log('[AI Booking] Parsed:', parsed);

      const { doctor_name, date, time } = parsed;

      // ── Step 2: Validate not in the past ─────────────────────────────────
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);

      if (date < today || (date === today && time <= currentTime)) {
        return res.status(400).json({
          success: false,
          message: `Cannot book appointment in the past (${date} at ${time}). Please choose a future date and time.`,
          error: 'PAST_DATE_TIME',
          parsed: { doctor_name, date, time },
        });
      }

      // ── Step 3: Check availability ────────────────────────────────────────
      console.log('[AI Booking] Checking availability for:', doctor_name, date, time);
      const availability = await findAvailableSlot(doctor_name, date, time);

      if (!availability.available) {
        return res.status(400).json({
          success: false,
          message: availability.message,
          suggestedTime: availability.suggestedTime || null,
          parsed: { doctor_name, date, time },
        });
      }

      // ── Step 4: Find doctor user ──────────────────────────────────────────
      const searchName = doctor_name.replace(/Dr\.?\s*/i, '').trim();
      const doctorUser = await User.findOne({
        name: { $regex: searchName, $options: 'i' },
        role: 'doctor',
      });

      if (!doctorUser) {
        return res.status(404).json({
          success: false,
          message: `No doctor named "${doctor_name}" was found. Please check the name.`,
          error: 'DOCTOR_NOT_FOUND',
          parsed: { doctor_name, date, time },
        });
      }

      // ── Step 5: Create appointment ────────────────────────────────────────
      const appt = await Appointment.create({
        patient: req.user.id,
        doctor: doctorUser._id,
        date,
        time,
        notes: `Booked via AI: "${message}"`,
        status: 'pending',
      });

      const populated = await Appointment.findById(appt._id)
        .populate('patient', 'name email')
        .populate('doctor', 'name email')
        .lean();

      // ── Step 6: Email notification (fire-and-forget) ───────────────────────
      const patientDoc = await User.findById(req.user.id);
      if (patientDoc?.email) {
        sendAppointmentBookedEmail({
          to: patientDoc.email,
          patientName: patientDoc.name,
          doctorName: doctorUser.name,
          date,
          time,
        }).catch((err) => console.error('[email]', err));
      }

      return res.status(201).json({
        success: true,
        message: `Appointment booked successfully with ${doctorUser.name} on ${date} at ${time}`,
        appointment: populated,
        parsed: { doctor_name, date, time },
        note: availability.relaxed ? 'Booked without explicit slot match (AI booking mode)' : undefined,
      });

    } catch (e) {
      console.error('[AI Booking] Unexpected error:', e);

      if (e.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'This time slot is already booked. Please choose a different time.',
          error: 'DUPLICATE_BOOKING',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Booking failed due to a server error. Please try again.',
        error: 'INTERNAL_ERROR',
      });
    }
  }
);


/**
 * GET /api/appointments/user — patient's appointments
 */
router.get('/user', authenticate, authorize('patient'), async (req, res) => {
  try {
    const list = await Appointment.find({ patient: req.user.id })
      .populate('doctor', 'name email')
      .sort({ date: -1, time: -1 })
      .lean();
    const withProfile = await Promise.all(
      list.map(async (a) => {
        const prof = await DoctorProfile.findOne({ user: a.doctor?._id }).lean();
        return {
          ...a,
          doctorProfileId: prof?._id,
          specialization: prof?.specialization,
        };
      })
    );
    return res.json({ appointments: withProfile });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load appointments' });
  }
});

/**
 * GET /api/appointments/doctor — doctor's booked appointments
 */
router.get('/doctor', authenticate, authorize('doctor'), async (req, res) => {
  try {
    const list = await Appointment.find({ doctor: req.user.id })
      .populate('patient', 'name email phone')
      .sort({ date: 1, time: 1 })
      .lean();
    return res.json({ appointments: list });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load appointments' });
  }
});

/**
 * PATCH /api/appointments/:id/status — doctor updates status
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize('doctor'),
  [
    param('id').isMongoId(),
    body('status').isIn(['pending', 'completed', 'cancelled']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }
    try {
      const appt = await Appointment.findById(req.params.id);
      if (!appt) return res.status(404).json({ message: 'Appointment not found' });
      if (appt.doctor.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not your appointment' });
      }
      appt.status = req.body.status;
      await appt.save();
      const populated = await Appointment.findById(appt._id)
        .populate('patient', 'name email')
        .populate('doctor', 'name email')
        .lean();
      return res.json({ appointment: populated });
    } catch (e) {
      return res.status(500).json({ message: 'Update failed' });
    }
  }
);

/**
 * GET /api/appointments/analytics — admin: simple counts
 */
router.get('/analytics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [total, pending, completed, cancelled, byDoctor] = await Promise.all([
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
      Appointment.aggregate([
        { $group: { _id: '$doctor', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);
    const doctorIds = byDoctor.map((d) => d._id);
    const users = await User.find({ _id: { $in: doctorIds } }).select('name').lean();
    const idToName = Object.fromEntries(users.map((u) => [u._id.toString(), u.name]));
    const topDoctors = byDoctor.map((d) => ({
      doctorId: d._id,
      name: idToName[d._id.toString()] || 'Unknown',
      count: d.count,
    }));
    return res.json({
      total,
      byStatus: { pending, completed, cancelled },
      topDoctors,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Analytics failed' });
  }
});

export default router;

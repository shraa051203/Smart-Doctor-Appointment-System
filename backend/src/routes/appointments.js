import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Appointment } from '../models/Appointment.js';
import { DoctorProfile } from '../models/DoctorProfile.js';
import { User } from '../models/User.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { sendAppointmentBookedEmail } from '../utils/email.js';

const router = Router();

function slotAvailableOnProfile(profile, date, time) {
  const day = profile.availableSlots?.find((d) => d.date === date);
  return day?.slots?.includes(time);
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

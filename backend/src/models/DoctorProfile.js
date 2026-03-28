import mongoose from 'mongoose';

/**
 * One profile per doctor user. availableSlots: per calendar date, list of "HH:mm" strings.
 */
const doctorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: { type: String, required: true, trim: true },
    experienceYears: { type: Number, default: 0, min: 0 },
    bio: { type: String, default: '', trim: true },
    /** { date: 'YYYY-MM-DD', slots: ['09:00', '10:00'] } */
    availableSlots: [
      {
        date: { type: String, required: true },
        slots: [{ type: String, required: true }],
      },
    ],
  },
  { timestamps: true }
);

doctorProfileSchema.index({ specialization: 1 });

export const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);

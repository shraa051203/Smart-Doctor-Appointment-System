import mongoose from 'mongoose';

const STATUSES = ['pending', 'completed', 'cancelled'];

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** YYYY-MM-DD */
    date: { type: String, required: true },
    /** HH:mm 24h */
    time: { type: String, required: true },
    status: {
      type: String,
      enum: STATUSES,
      default: 'pending',
    },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

// Prevent double booking: same doctor + date + time
appointmentSchema.index({ doctor: 1, date: 1, time: 1 }, { unique: true });

export const Appointment = mongoose.model('Appointment', appointmentSchema);
export { STATUSES };

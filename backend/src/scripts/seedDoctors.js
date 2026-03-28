/**
 * Seeds demo doctors with specializations and available time slots.
 * Safe to run multiple times: skips users that already exist (by email).
 *
 * Run: npm run seed:doctors
 *
 * Demo login for each doctor: password from SEED_DOCTOR_PASSWORD in .env (default Doctor123!)
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { DoctorProfile } from '../models/DoctorProfile.js';

function formatLocalYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(base, n) {
  const x = new Date(base);
  x.setDate(x.getDate() + n);
  return formatLocalYMD(x);
}

/** Standard clinic hours (24h strings) */
const MORNING = ['09:00', '10:00', '11:00'];
const AFTERNOON = ['14:00', '15:00', '16:00'];
const FULL = [...MORNING, ...AFTERNOON];

function buildAvailabilityFromToday() {
  const today = new Date();
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(today, i);
    // Stagger slots so different days feel realistic
    let slots;
    if (i % 3 === 0) slots = FULL;
    else if (i % 3 === 1) slots = MORNING;
    else slots = AFTERNOON;
    days.push({ date, slots: [...slots] });
  }
  return days;
}

const DEMO_DOCTORS = [
  {
    name: 'Dr. Ananya Sharma',
    email: 'ananya.sharma@demo.clinic',
    phone: '+91 98765 43210',
    specialization: 'Cardiology',
    experienceYears: 12,
    bio: 'Interventional cardiologist. Focus on heart failure and preventive care.',
  },
  {
    name: 'Dr. Rohan Mehta',
    email: 'rohan.mehta@demo.clinic',
    phone: '+91 98765 43211',
    specialization: 'Dermatology',
    experienceYears: 8,
    bio: 'Skin disorders, acne, and cosmetic dermatology consultations.',
  },
  {
    name: 'Dr. Priya Nair',
    email: 'priya.nair@demo.clinic',
    phone: '+91 98765 43212',
    specialization: 'Pediatrics',
    experienceYears: 10,
    bio: 'Child health, vaccinations, and developmental assessments.',
  },
  {
    name: 'Dr. Vikram Singh',
    email: 'vikram.singh@demo.clinic',
    phone: '+91 98765 43213',
    specialization: 'Orthopedics',
    experienceYears: 15,
    bio: 'Sports injuries, joint pain, and post-surgical rehabilitation planning.',
  },
  {
    name: 'Dr. Kavita Desai',
    email: 'kavita.desai@demo.clinic',
    phone: '+91 98765 43214',
    specialization: 'General Medicine',
    experienceYears: 6,
    bio: 'Primary care, chronic disease management, and preventive checkups.',
  },
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGODB_URI in .env');
    process.exit(1);
  }

  const plainPassword = process.env.SEED_DOCTOR_PASSWORD || 'Doctor123!';
  const passwordHash = await bcrypt.hash(plainPassword, 12);
  const availabilityTemplate = buildAvailabilityFromToday();

  await mongoose.connect(uri);

  let created = 0;
  let skipped = 0;

  for (const doc of DEMO_DOCTORS) {
    const existing = await User.findOne({ email: doc.email });
    if (existing) {
      console.log('Skip (exists):', doc.email);
      skipped += 1;
      continue;
    }

    const user = await User.create({
      name: doc.name,
      email: doc.email,
      passwordHash,
      role: 'doctor',
      phone: doc.phone,
    });

    await DoctorProfile.create({
      user: user._id,
      specialization: doc.specialization,
      experienceYears: doc.experienceYears,
      bio: doc.bio,
      // Copy template so each doctor gets the same calendar window (bookable slots)
      availableSlots: availabilityTemplate.map((d) => ({
        date: d.date,
        slots: [...d.slots],
      })),
    });

    console.log('Created:', doc.name, `(${doc.specialization})`, '—', doc.email);
    created += 1;
  }

  await mongoose.disconnect();

  console.log('\nDone. Created:', created, 'Skipped:', skipped);
  console.log('Demo doctor password:', plainPassword);
  console.log('Slots are set for the next 7 days (local date). Open the app as a patient and book.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

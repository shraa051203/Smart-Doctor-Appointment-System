import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../backend/src/models/User.js';

async function check() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_doctor_appointments';
  await mongoose.connect(uri);
  const doctors = await User.find({ role: 'doctor' });
  console.log('Doctors found:', doctors.length);
  doctors.forEach(d => {
    console.log(`- ${d.name} (${d.email}), role: "${d.role}"`);
  });
  await mongoose.disconnect();
}

check().catch(console.error);

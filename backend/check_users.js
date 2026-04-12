import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './src/models/User.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({}, 'name email passwordHash').limit(5);
  console.log('Users with passwordHash:');
  users.forEach(u => console.log(`${u.name} (${u.email}): hasPassword=${!!u.passwordHash}`));
  await mongoose.disconnect();
}

check().catch(console.error);
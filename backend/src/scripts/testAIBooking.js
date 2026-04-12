import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { parseAppointmentRequest, findAvailableSlot } from '../utils/aiParser.js';

// Test the AI booking functionality
async function testAIBooking() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Test 1: Parse natural language
    console.log('\n=== Test 1: Parse Natural Language ===');
    const testMessages = [
      "Book appointment with Dr. Sharma tomorrow at 5pm",
      "Schedule with Dr. Ananya Sharma next Monday at 2:30 PM",
      "Book with Dr. Rohan Mehta today at 10am"
    ];

    for (const message of testMessages) {
      console.log(`\nInput: "${message}"`);
      try {
        const parsed = await parseAppointmentRequest(message);
        console.log('Parsed:', parsed);

        // Test 2: Check availability
        const availability = await findAvailableSlot(parsed.doctor_name, parsed.date, parsed.time);
        console.log('Availability:', availability);

      } catch (error) {
        console.error('Error:', error.message);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAIBooking();
}

export { testAIBooking };
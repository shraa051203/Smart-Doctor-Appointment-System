import OpenAI from 'openai';

let openai = null;

// ── OpenAI client (lazy singleton) ──────────────────────────────────────────

function getOpenAIClient() {
  if (openai) return openai;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
    return null;
  }
  openai = new OpenAI({ apiKey });
  console.log('[aiParser] OpenAI client initialized ✅');
  return openai;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function parseDateText(text) {
  if (!text) return null;
  const normalized = String(text).toLowerCase().trim();
  const now = new Date();

  // ISO date YYYY-MM-DD
  const isoMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  // Slash/dash date MM/DD/YYYY or DD/MM/YYYY
  const slashDate = normalized.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slashDate) {
    let [, a, b, y] = slashDate.map(Number);
    if (y < 100) y += 2000;
    const dt = new Date(y, a - 1, b);
    if (!isNaN(dt.getTime())) return dt.toISOString().split('T')[0];
  }

  if (/\btoday\b/.test(normalized)) return now.toISOString().split('T')[0];
  
  if (/\btomorrow\b/.test(normalized)) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + 1);
    return dt.toISOString().split('T')[0];
  }

  if (/\bday after tomorrow\b/.test(normalized)) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + 2);
    return dt.toISOString().split('T')[0];
  }

  // "next Monday", "this Friday" etc.
  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const weekdayMatch = normalized.match(/\b(?:next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (weekdayMatch) {
    const target = weekdays.indexOf(weekdayMatch[1]);
    const current = now.getDay();
    let diff = (target - current + 7) % 7;
    if (diff === 0) diff = 7;
    const dt = new Date(now);
    dt.setDate(dt.getDate() + diff);
    return dt.toISOString().split('T')[0];
  }

  return null;
}

function parseTimeText(text) {
  if (!text) return null;
  const lowered = String(text).toLowerCase().trim();
  if (/no time|any time|unspecified/.test(lowered)) return '09:00';

  const m = lowered.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2] || '0', 10);
  const ampm = m[3];

  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// ── Robust JSON extractor ───────────────────────────────────────────────────

function extractJSON(content) {
  if (!content) throw new Error('Empty content to parse');
  
  // Strip markdown code fences
  let cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (_) {}

  // Find the first complete JSON object in the string
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (_) {}
  }

  throw new Error(`Cannot extract JSON from: ${cleaned.slice(0, 200)}`);
}

// ── Pure regex fallback (no AI required) ────────────────────────────────────

function fallbackParse(userInput) {
  const input = String(userInput || '');

  // Doctor name: "Dr. X" or "Dr X" or "Doctor X"
  const drMatch = input.match(/(?:Dr\.?\s+|Doctor\s+)([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  const doctor_name = drMatch ? `Dr. ${drMatch[1].trim()}` : null;

  const date = parseDateText(input);
  const time = parseTimeText(input);

  return { doctor_name, date, time };
}

// ── Main export ─────────────────────────────────────────────────────────────

/**
 * Parse natural language appointment booking request.
 * Uses OpenAI when available, falls back to regex parsing.
 *
 * @param {string} userInput  e.g. "Book appointment with Dr. Sharma tomorrow at 5pm"
 * @returns {{ doctor_name: string, date: string, time: string }}
 */
export async function parseAppointmentRequest(userInput) {
  const today = new Date().toISOString().split('T')[0];
  const client = getOpenAIClient();

  let parsed = null;

  // ── Try OpenAI ────────────────────────────────────────────────────────────
  if (client) {
    const systemPrompt = `You extract appointment booking data from natural language.
You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no extra text.
Today's date is ${today}.

Output format (always):
{"doctor_name": "Dr. <LastName>", "date": "YYYY-MM-DD", "time": "HH:mm"}

Rules:
- doctor_name: Full name as mentioned (e.g. "Dr. Sharma"). If missing, return null.
- date: Convert relative dates (tomorrow, next Monday, etc.) to YYYY-MM-DD using today=${today}.
- time: Convert to 24-hour HH:mm. "5pm"→"17:00", "10am"→"10:00", "2:30 PM"→"14:30".
- If date or time is not specified, return null for that field.`;

    const userPrompt = `Request: "${userInput}"

Respond with ONLY JSON:`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 120,
        temperature: 0,
      });

      const raw = response?.choices?.[0]?.message?.content?.trim();
      console.log('[aiParser] OpenAI raw response:', raw);

      if (raw) {
        try {
          parsed = extractJSON(raw);
          console.log('[aiParser] OpenAI parsed:', parsed);
        } catch (jsonErr) {
          console.warn('[aiParser] JSON parse failed, using regex fallback:', jsonErr.message);
        }
      }
    } catch (apiErr) {
      console.warn('[aiParser] OpenAI API error, using regex fallback:', apiErr.message);
    }
  } else {
    console.log('[aiParser] OpenAI not available → using regex fallback');
  }

  // ── Regex fallback (always supplement missing fields) ─────────────────────
  const fallback = fallbackParse(userInput);

  let doctor_name = parsed?.doctor_name || fallback.doctor_name;
  const rawDate   = parsed?.date || null;
  const rawTime   = parsed?.time || null;

  // Sanitize doctor name: strip temporal keywords that OpenAI sometimes appends
  // e.g. "Dr. Sharma tomorrow" → "Dr. Sharma"
  if (doctor_name) {
    const TEMPORAL_WORDS = /\b(today|tomorrow|day after tomorrow|next|this|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at|on|for|in|from|by|a|the)\b.*/i;
    doctor_name = doctor_name.replace(TEMPORAL_WORDS, '').trim();
    // If name becomes empty after stripping, use fallback
    if (!doctor_name) doctor_name = fallback.doctor_name;
  }

  // Normalize date (AI might return relative text like "tomorrow" or ISO)
  const date = parseDateText(rawDate) || fallback.date;
  // Normalize time (AI might return "5pm" or "17:00")
  const time = parseTimeText(rawTime) || fallback.time;

  // Final validation
  if (!doctor_name) {
    throw new Error(
      'No doctor name found. Please include a doctor name, e.g. "Book with Dr. Sharma tomorrow at 5pm"'
    );
  }
  if (!date) {
    throw new Error(
      'No date found. Please include a date, e.g. "tomorrow", "next Monday", or "2026-04-10"'
    );
  }
  if (!time) {
    throw new Error(
      'No time found. Please include a time, e.g. "at 5pm", "at 10:00am", "at 14:30"'
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD`);
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error(`Invalid time format: "${time}". Expected HH:mm`);
  }

  return {
    doctor_name: String(doctor_name).trim(),
    date,
    time,
  };
}

/**
 * Check if a doctor has an available slot (or if they have ANY slots, be flexible for AI booking).
 */
export async function findAvailableSlot(doctorName, date, requestedTime) {
  const { DoctorProfile } = await import('../models/DoctorProfile.js');
  const { User } = await import('../models/User.js');

  try {
    // Strip "Dr." prefix for search
    const searchName = doctorName.replace(/Dr\.?\s*/i, '').trim();

    const doctorUser = await User.findOne({
      name: { $regex: searchName, $options: 'i' },
      role: 'doctor',
    });

    if (!doctorUser) {
      return {
        available: false,
        message: `Doctor "${doctorName}" not found in the system. Please check the name.`,
      };
    }

    const doctorProfile = await DoctorProfile.findOne({ user: doctorUser._id });
    if (!doctorProfile) {
      return {
        available: false,
        message: `Doctor profile not found for ${doctorName}.`,
      };
    }

    // If doctor has no slots at all, still allow AI booking (admin can manage slots)
    if (!doctorProfile.availableSlots || doctorProfile.availableSlots.length === 0) {
      return {
        available: true,
        message: `Doctor ${doctorName} found. Booking slot ${requestedTime} on ${date}.`,
        relaxed: true,
      };
    }

    const daySlots = doctorProfile.availableSlots.find((s) => s.date === date);

    if (!daySlots) {
      // Doctor has slots but not for this date — still allow with a warning
      return {
        available: true,
        message: `Note: ${doctorName} has no published slots for ${date}, but booking has been created.`,
        relaxed: true,
      };
    }

    if (daySlots.slots.includes(requestedTime)) {
      return {
        available: true,
        message: `Slot ${requestedTime} is available with ${doctorName} on ${date}.`,
      };
    }

    // Suggest next available slot
    const laterSlots = daySlots.slots.filter((s) => s > requestedTime);
    if (laterSlots.length > 0) {
      return {
        available: false,
        suggestedTime: laterSlots[0],
        message: `${requestedTime} is not available. Next available slot: ${laterSlots[0]}.`,
      };
    }

    return {
      available: false,
      message: `No available slots for ${doctorName} on ${date} at or after ${requestedTime}.`,
    };
  } catch (error) {
    console.error('[findAvailableSlot] Error:', error);
    return {
      available: false,
      message: 'Error checking availability. Please try again.',
    };
  }
}
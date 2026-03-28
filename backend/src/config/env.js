/**
 * Validates required environment variables before the server accepts traffic.
 */
export function validateEnv() {
  const mongo = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongo || !String(mongo).trim()) {
    console.error('FATAL: Set MONGODB_URI (or MONGO_URI) in .env');
    process.exit(1);
  }

  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;

  if (isProd) {
    if (!secret || secret.length < 32) {
      console.error('FATAL: In production, JWT_SECRET must be at least 32 characters.');
      process.exit(1);
    }
    const weak = ['secret', 'change_this', 'your-secret'];
    if (weak.some((w) => secret.toLowerCase().includes(w))) {
      console.error('FATAL: Use a strong random JWT_SECRET in production.');
      process.exit(1);
    }
  } else if (!secret) {
    console.warn('Warning: JWT_SECRET is not set. Auth will fail until you set it in .env');
  }
}

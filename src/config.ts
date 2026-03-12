import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  dbHost: process.env.DB_HOST || 'localhost',
  dbName: process.env.DB_NAME || 'accidents',
  dbUser: process.env.DB_USER || 'dbuser',
  dbPass: process.env.DB_PASS || 'dbpass',
  appUrl: process.env.APP_URL || 'http://localhost:8080',
  appEnv: process.env.APP_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',

  // OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  appleClientId: process.env.APPLE_CLIENT_ID || '',
  appleTeamId: process.env.APPLE_TEAM_ID || '',
  appleKeyId: process.env.APPLE_KEY_ID || '',
  mastodonClientId: process.env.MASTODON_CLIENT_ID || '',
  mastodonClientSecret: process.env.MASTODON_CLIENT_SECRET || '',
  blueskyClientId: process.env.BLUESKY_CLIENT_ID || '',
  blueskyClientSecret: process.env.BLUESKY_CLIENT_SECRET || '',
} as const;

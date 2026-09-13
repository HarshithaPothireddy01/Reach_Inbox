import "dotenv/config";

export const PORT = Number(process.env.PORT || 5000);

export const REDIS_URL =
  process.env.REDIS_URL || "redis://redis:6379";

export const WORKER_CONCURRENCY =
  Number(process.env.WORKER_CONCURRENCY || 5);

export const MIN_DELAY_SECONDS =
  Number(process.env.MIN_DELAY_SECONDS || 1);

export const DEFAULT_HOURLY_LIMIT =
  Number(process.env.DEFAULT_HOURLY_LIMIT || 100);

export const SMTP_HOST = process.env.SMTP_HOST!;
export const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
export const SMTP_USER = process.env.SMTP_USER!;
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD!;

export const SLACK_CLIENT_ID =
  process.env.SLACK_CLIENT_ID || "";

export const SLACK_CLIENT_SECRET =
  process.env.SLACK_CLIENT_SECRET || "";

export const SLACK_REDIRECT_URI =
  process.env.SLACK_REDIRECT_URI ||
  "http://localhost:5000/api/slack/callback";

export const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "";

export const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "";

export const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL ||
  "http://localhost:5000/api/auth/google/callback";

export const JWT_SECRET =
  process.env.JWT_SECRET || "development-secret";
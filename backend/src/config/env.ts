import 'dotenv/config';

export const env = {
  PORT: Number(process.env.PORT ?? 5321),
  HOST: process.env.HOST ?? '0.0.0.0',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  STORAGE_DIR: process.env.STORAGE_DIR ?? './storage',
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
};

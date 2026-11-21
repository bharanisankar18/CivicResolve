import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { z } from "zod";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

// Resolve sqlite database location across build/monorepo structures
const possibleDbPaths = [
  path.resolve(__dirname, "../../prisma/dev.db"),
  path.resolve(__dirname, "../prisma/dev.db"),
  path.resolve(process.cwd(), "apps/api/prisma/dev.db"),
  path.resolve(process.cwd(), "prisma/dev.db"),
  path.resolve(process.cwd(), "dev.db"),
];
const foundDb = possibleDbPaths.find((p) => fs.existsSync(p));

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = foundDb ? `file:${foundDb}` : "file:./dev.db";
} else if (process.env.DATABASE_URL === "file:./dev.db" && foundDb) {
  process.env.DATABASE_URL = `file:${foundDb}`;
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "civicresolve-super-secret-jwt-key-2026";
}
if (!process.env.COOKIE_SECRET) {
  process.env.COOKIE_SECRET = "civicresolve-super-secret-cookie-key-2026";
}

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters").default("civicresolve-super-secret-jwt-key-2026"),
  COOKIE_SECRET: z.string().min(16, "COOKIE_SECRET must be at least 16 characters").optional().default("civicresolve-super-secret-cookie-key-2026"),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-1.5-flash"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  throw new Error("Environment configuration validation failed");
}

export const env = parsed.data;

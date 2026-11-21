import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { startSlaEscalationJob } from "./jobs/slaEscalationCron";

process.on("unhandledRejection", (reason) => {
  logger.error(reason, "Unhandled Rejection");
});
process.on("uncaughtException", (error) => {
  logger.error(error, "Uncaught Exception");
});

const app = createApp();

const server = app.listen(env.PORT, "0.0.0.0", () => {
  logger.info(`🚀 CivicResolve API running on http://0.0.0.0:${env.PORT}`);
  logger.info(`Environment: ${env.NODE_ENV} | Gemini Model: ${env.GEMINI_MODEL}`);

  // Start background jobs if not running in test mode
  if (env.NODE_ENV !== "test") {
    try {
      startSlaEscalationJob();
      logger.info("⏱️ SLA Escalation Cron Job initialized.");
    } catch (cronErr) {
      logger.error(cronErr, "Failed to initialize SLA Cron Job");
    }
  }
});

server.on("error", (err: NodeJS.ErrnoException) => {
  logger.error(err, "Server failed to start");
  process.exit(1);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
  });
});

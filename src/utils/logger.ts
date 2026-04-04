import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

// Custom log format for structured output
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let meta = Object.keys(metadata).length ? JSON.stringify(metadata) : "";
  return `${timestamp} [${level}] : ${message} ${meta}`;
});

// Winston logger configuration with levels: error, warn, info, http, verbose, debug, silly
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(
    colorize(),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    customFormat
  ),
  transports: [
    new winston.transports.Console()
  ],
});

// Optionally, for other files to use correct type
export type Logger = typeof logger;
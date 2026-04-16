import winston from "winston";

const { combine, timestamp, printf, colorize, json } = winston.format;

const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

const localFormat = printf(({ level, message, timestamp, ...metadata }) => {
  const meta = Object.keys(metadata).length ? JSON.stringify(metadata) : "";
  return `${timestamp} [${level}] : ${message} ${meta}`;
});

/**
 * Lambda writes stdout to CloudWatch automatically.
 * - On Lambda: JSON format (structured logging, easy to query with CloudWatch Insights).
 * - Local / Docker: colorized human-readable output.
 */
export const logger = winston.createLogger({
  level: (process.env.LOG_LEVEL || "info").toLowerCase(),
  format: isLambda
    ? combine(timestamp({ format: "YYYY-MM-DD'T'HH:mm:ss.SSSZ" }), json())
    : combine(colorize(), timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), localFormat),
  transports: [new winston.transports.Console()],
});

export type Logger = typeof logger;



import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const timeFormat = "YYYY-MM-DD hh:mm:ss a";

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} | ${level} | ${stack || message}`;
});

const fileFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} | ${level} | ${stack || message}`;
});

const logger = winston.createLogger({
  level: "debug",

  format: combine(errors({ stack: true })),

  transports: [
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: combine(
        timestamp({ format: timeFormat }),
        fileFormat
      ),
    }),

    new winston.transports.File({
      filename: "logs/combined.log",
      format: combine(
        timestamp({ format: timeFormat }),
        fileFormat
      ),
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }), // ONLY console gets colors
        timestamp({ format: timeFormat }),
        consoleFormat
      ),
    })
  );
}

export default logger;

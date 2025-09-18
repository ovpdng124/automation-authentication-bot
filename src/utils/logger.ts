import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'automation-bot' },
  transports: [
    // Log all levels
    new winston.transports.File({
      filename: 'logs/log.log'
    }),
    // Log errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, service }) => {
        return `[${timestamp}][${service}] ${level}: ${message}`;
      }),
      winston.format.colorize({ all: true })
    )
  }));
}

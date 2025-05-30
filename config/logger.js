const winston = require('winston');
const { combine, timestamp, json } = winston.format;
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    json({
      space: 2 // Pretty print JSON in log files
    })
  ),
  defaultMeta: {
    service: 'payment-service',
    env: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport with colorized output
    new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata, null, 2)}`;
          }
          return msg;
        })
      ),
      handleExceptions: true
    }),
    
    // Error log file (only errors)
    new winston.transports.File({
      level: 'error',
      filename: path.join(logDir, 'error.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      tailable: true,
      zippedArchive: true
    }),
    
    // Combined log file (all levels)
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true,
      zippedArchive: true
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    })
  ],
  exitOnError: false // Don't crash on unhandled exceptions
});

// Add stream for morgan (HTTP request logging)
logger.stream = {
  write: function(message, encoding) {
    logger.info(message.trim());
  }
};

// Function to log unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Function to log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Note: In production, you might want to exit here
  // process.exit(1);
});

module.exports = logger;
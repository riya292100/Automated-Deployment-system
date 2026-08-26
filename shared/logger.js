/**
 * Structured Logger with log levels and JSON / formatted output
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevelName = (process.env.LOG_LEVEL || 'info').toLowerCase();
const currentLevel =
  LOG_LEVELS[currentLevelName] !== undefined ? LOG_LEVELS[currentLevelName] : LOG_LEVELS.info;

function formatLog(level, context, message, meta = {}) {
  const timestamp = new Date().toISOString();

  if (process.env.LOG_FORMAT === 'json') {
    return JSON.stringify({
      timestamp,
      level,
      context,
      message,
      ...meta,
    });
  }

  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}${metaStr}`;
}

const logger = {
  debug(context, message, meta) {
    if (currentLevel <= LOG_LEVELS.debug) {
      console.log(formatLog('debug', context, message, meta));
    }
  },

  info(context, message, meta) {
    if (currentLevel <= LOG_LEVELS.info) {
      console.log(formatLog('info', context, message, meta));
    }
  },

  warn(context, message, meta) {
    if (currentLevel <= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', context, message, meta));
    }
  },

  error(context, message, meta) {
    if (currentLevel <= LOG_LEVELS.error) {
      console.error(formatLog('error', context, message, meta));
    }
  },

  child(context) {
    return {
      debug: (msg, meta) => logger.debug(context, msg, meta),
      info: (msg, meta) => logger.info(context, msg, meta),
      warn: (msg, meta) => logger.warn(context, msg, meta),
      error: (msg, meta) => logger.error(context, msg, meta),
    };
  },
};

module.exports = logger;

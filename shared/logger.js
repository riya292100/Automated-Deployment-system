/**
 * Structured Logger with log levels, JSON / formatted output, and Sentry / Error Tracking integration
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let customErrorHook = null;

function getCurrentLevel() {
  const currentLevelName = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LOG_LEVELS[currentLevelName] !== undefined
    ? LOG_LEVELS[currentLevelName]
    : LOG_LEVELS.info;
}

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
    if (getCurrentLevel() <= LOG_LEVELS.debug) {
      console.log(formatLog('debug', context, message, meta));
    }
  },

  info(context, message, meta) {
    if (getCurrentLevel() <= LOG_LEVELS.info) {
      console.log(formatLog('info', context, message, meta));
    }
  },

  warn(context, message, meta) {
    if (getCurrentLevel() <= LOG_LEVELS.warn) {
      console.warn(formatLog('warn', context, message, meta));
    }
  },

  error(context, message, meta) {
    if (getCurrentLevel() <= LOG_LEVELS.error) {
      console.error(formatLog('error', context, message, meta));
    }

    // Structured Error Tracking (Sentry DSN or custom webhook/callback)
    if (customErrorHook || process.env.SENTRY_DSN) {
      const errorPayload = {
        timestamp: new Date().toISOString(),
        context,
        message,
        meta,
        dsn: process.env.SENTRY_DSN || null,
      };

      if (typeof customErrorHook === 'function') {
        try {
          customErrorHook(errorPayload);
        } catch (_hookErr) {
          // Prevent error tracking failure from crashing logging
        }
      }
    }
  },

  setErrorHook(fn) {
    customErrorHook = typeof fn === 'function' ? fn : null;
  },

  getErrorHook() {
    return customErrorHook;
  },

  child(context) {
    return {
      debug: (msg, meta) => logger.debug(context, msg, meta),
      info: (msg, meta) => logger.info(context, msg, meta),
      warn: (msg, meta) => logger.warn(context, msg, meta),
      error: (msg, meta) => logger.error(context, msg, meta),
      context,
    };
  },
};

module.exports = logger;

// Simple logger utility that uses console.log with prefixes
// Avoids winston dependency for easier deployment

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = logLevels[process.env.LOG_LEVEL?.toLowerCase()] ?? logLevels.info;

const logger = {
  error: (...args) => {
    if (currentLevel >= logLevels.error) {
      console.error('❌ ERROR:', ...args);
    }
  },
  
  warn: (...args) => {
    if (currentLevel >= logLevels.warn) {
      console.warn('⚠️  WARN:', ...args);
    }
  },
  
  info: (...args) => {
    if (currentLevel >= logLevels.info) {
      console.log('ℹ️  INFO:', ...args);
    }
  },
  
  debug: (...args) => {
    if (currentLevel >= logLevels.debug) {
      console.log('🔍 DEBUG:', ...args);
    }
  },
  
  log: (...args) => {
    // Alias for info
    logger.info(...args);
  }
};

module.exports = logger;
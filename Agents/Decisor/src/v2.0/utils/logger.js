const getTimestamp = () => new Date().toISOString();

const colors = {
  reset: '\x1b[0m',
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m'
};

const logger = {
  debug: (message, data = null) => {
    const timestamp = getTimestamp();
    const level = 'DEBUG';
    const coloredLevel = `${colors.debug}[${level}]${colors.reset}`;
    console.log(`[${timestamp}] ${coloredLevel} ${message}`, data ? data : '');
  },
  info: (message, data = null) => {
    const timestamp = getTimestamp();
    const level = 'INFO';
    const coloredLevel = `${colors.info}[${level}]${colors.reset}`;
    console.log(`[${timestamp}] ${coloredLevel} ${message}`, data ? data : '');
  },
  warn: (message, data = null) => {
    const timestamp = getTimestamp();
    const level = 'WARN';
    const coloredLevel = `${colors.warn}[${level}]${colors.reset}`;
    console.log(`[${timestamp}] ${coloredLevel} ${message}`, data ? data : '');
  },
  error: (message, data = null) => {
    const timestamp = getTimestamp();
    const level = 'ERROR';
    const coloredLevel = `${colors.error}[${level}]${colors.reset}`;
    console.error(`[${timestamp}] ${coloredLevel} ${message}`, data ? data : '');
  }
};

module.exports = logger;
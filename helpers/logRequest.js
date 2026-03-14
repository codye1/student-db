const config = require('../config');

const logRequest = (req, statusCode) => {
  const level = statusCode >= 500 ? '[ERROR]' : '[INFO]';
  const agent = req.headers['user-agent'] || '-';
  const ip = req.socket?.remoteAddress || '-';
  const line = `${level} ${req.method} ${req.url} | Status: ${statusCode} | Agent: ${agent} | IP: ${ip}`;

  if (config.NODE_ENV === 'development') {
    process.stdout.write(line + '\n');
    return;
  }

  if (statusCode >= 400) {
    process.stderr.write(line + '\n');
  }
};

module.exports = logRequest;

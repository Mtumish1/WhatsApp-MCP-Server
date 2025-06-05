// whatsapp-llm-bridge-ts/src/utils/logger.ts
// This is your project's logging utility. It helps you see what your program is doing.
// Think of it as a journalist for your app, recording important events.
import pino from 'pino';

// Configure Pino to log to console and potentially a file later.
// During development, pino-pretty makes logs easy to read.
const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', // Log more detail in development
  transport: {
    target: 'pino-pretty', // Makes logs pretty in the console
    options: {
      colorize: true,
      translateTime: 'SYS:HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  },
});

export default logger;
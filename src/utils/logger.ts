import pino from 'pino';

/**
 * Structured logger. Never log raw API keys, bot tokens, or full user prompt
 * content here - callers must redact/omit those fields before logging.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: ['*.apiKey', '*.token', '*.password', '*.headers.authorization'],
});

export const LogEvent = {
  AI_REQUEST: 'AI_REQUEST',
  AI_RESPONSE: 'AI_RESPONSE',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  SECURITY: 'SECURITY',
  BOT_START: 'BOT_START',
  BOT_STOP: 'BOT_STOP',
} as const;

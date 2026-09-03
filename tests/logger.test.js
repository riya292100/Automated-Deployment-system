const logger = require('../shared/logger');

describe('Shared Logger & Error Tracking Suite', () => {
  const originalEnv = process.env;
  let logSpy, warnSpy, errorSpy;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logger.setErrorHook(null);
  });

  afterEach(() => {
    process.env = originalEnv;
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  test('should log info messages to console', () => {
    logger.info('TestContext', 'Info message', { key: 'val' });
    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain('[INFO]');
    expect(output).toContain('[TestContext]');
    expect(output).toContain('Info message');
  });

  test('should log warning messages to console.warn', () => {
    logger.warn('TestContext', 'Warning message');
    expect(warnSpy).toHaveBeenCalled();
    const output = warnSpy.mock.calls[0][0];
    expect(output).toContain('[WARN]');
  });

  test('should log error messages to console.error', () => {
    logger.error('TestContext', 'Error message');
    expect(errorSpy).toHaveBeenCalled();
    const output = errorSpy.mock.calls[0][0];
    expect(output).toContain('[ERROR]');
  });

  test('should format log output as valid JSON when LOG_FORMAT=json', () => {
    process.env.LOG_FORMAT = 'json';
    logger.info('JsonContext', 'Formatted as JSON', { testId: 42 });
    expect(logSpy).toHaveBeenCalled();
    const callArg = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(callArg);
    expect(parsed.level).toBe('info');
    expect(parsed.context).toBe('JsonContext');
    expect(parsed.testId).toBe(42);
  });

  test('should create child loggers with persistent context', () => {
    const child = logger.child('ChildModule');
    child.info('Child info message');
    expect(logSpy).toHaveBeenCalled();
    expect(logSpy.mock.calls[0][0]).toContain('[ChildModule]');
  });

  test('should invoke error tracking hook when logger.error is called', () => {
    const errorTrackingMock = jest.fn();
    logger.setErrorHook(errorTrackingMock);

    logger.error('PaymentService', 'Payment failed', { reason: 'card_declined' });

    expect(errorTrackingMock).toHaveBeenCalledTimes(1);
    const payload = errorTrackingMock.mock.calls[0][0];
    expect(payload.context).toBe('PaymentService');
    expect(payload.message).toBe('Payment failed');
    expect(payload.meta.reason).toBe('card_declined');
    expect(payload.timestamp).toBeDefined();
  });

  test('should forward SENTRY_DSN in error tracking payload when configured', () => {
    process.env.SENTRY_DSN = 'https://abc@o123.ingest.sentry.io/456';
    const mockHook = jest.fn();
    logger.setErrorHook(mockHook);

    logger.error('WorkerEngine', 'Out of memory');
    expect(mockHook).toHaveBeenCalled();
    expect(mockHook.mock.calls[0][0].dsn).toBe('https://abc@o123.ingest.sentry.io/456');
  });

  test('should not crash if custom error tracking hook throws an error', () => {
    logger.setErrorHook(() => {
      throw new Error('Sentry network failure');
    });

    expect(() => {
      logger.error('ResilientContext', 'Fatal crash error');
    }).not.toThrow();

    expect(errorSpy).toHaveBeenCalled();
  });
});

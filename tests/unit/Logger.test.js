/**
 * @fileoverview Tests para Logger
 */

'use strict';

const { Logger, LOG_LEVELS } = require('../../src/shared/utils/Logger');

describe('Logger', () => {
    let logger;
    let consoleSpy;

    beforeEach(() => {
        logger = new Logger({
            botName: 'TestBot',
            console: true,
            file: false,
            minLevel: 'DEBUG'
        });
        consoleSpy = {
            log: jest.spyOn(console, 'log').mockImplementation(),
            error: jest.spyOn(console, 'error').mockImplementation(),
            warn: jest.spyOn(console, 'warn').mockImplementation()
        };
    });

    afterEach(async () => {
        await logger.destroy();
        consoleSpy.log.mockRestore();
        consoleSpy.error.mockRestore();
        consoleSpy.warn.mockRestore();
    });

    describe('logging levels', () => {
        test('should log debug messages', () => {
            logger.debug('Test debug message', 'TestContext');
            expect(consoleSpy.log).toHaveBeenCalled();
        });

        test('should log info messages', () => {
            logger.info('Test info message', 'TestContext');
            expect(consoleSpy.log).toHaveBeenCalled();
        });

        test('should log warn messages', () => {
            logger.warn('Test warn message', 'TestContext');
            expect(consoleSpy.warn).toHaveBeenCalled();
        });

        test('should log error messages', () => {
            logger.error('Test error message', new Error('Test error'), 'TestContext');
            expect(consoleSpy.error).toHaveBeenCalled();
        });
    });

    describe('format output', () => {
        test('should include timestamp in output', () => {
            logger.info('Test message');
            const output = consoleSpy.log.mock.calls[0][0];
            expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
        });

        test('should include level in output', () => {
            logger.info('Test message');
            const output = consoleSpy.log.mock.calls[0][0];
            expect(output).toContain('[INFO]');
        });

        test('should include bot name in output', () => {
            logger.info('Test message');
            const output = consoleSpy.log.mock.calls[0][0];
            expect(output).toContain('[TestBot]');
        });

        test('should include context when provided', () => {
            logger.info('Test message', 'MyContext');
            const output = consoleSpy.log.mock.calls[0][0];
            expect(output).toContain('(MyContext)');
        });
    });

    describe('filtering', () => {
        test('should not log below minLevel', () => {
            const quietLogger = new Logger({
                botName: 'QuietBot',
                console: true,
                file: false,
                minLevel: 'ERROR'
            });

            quietLogger.info('This should not appear');
            expect(consoleSpy.log).not.toHaveBeenCalled();

            quietLogger.error('This should appear');
            expect(consoleSpy.error).toHaveBeenCalled();

            quietLogger.destroy();
        });
    });

    describe('traceId', () => {
        test('should set traceId', () => {
            logger.setTraceId('trace-123');
            expect(logger.traceId).toBe('trace-123');
        });
    });

    describe('child logger', () => {
        test('should create child with context', () => {
            const child = logger.child('ChildContext');
            child.info('Test from child');
            const output = consoleSpy.log.mock.calls[0][0];
            expect(output).toContain('(ChildContext)');
            child.destroy();
        });
    });
});

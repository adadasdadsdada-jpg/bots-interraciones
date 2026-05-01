/**
 * @fileoverview Tests para StringUtils
 */

'use strict';

const StringUtils = require('../../src/shared/utils/StringUtils');

describe('StringUtils', () => {
    describe('truncate', () => {
        test('should return original string if shorter than max', () => {
            expect(StringUtils.truncate('hello', 10)).toBe('hello');
        });

        test('should truncate string with suffix', () => {
            expect(StringUtils.truncate('hello world', 8)).toBe('hello...');
        });

        test('should handle null/undefined', () => {
            expect(StringUtils.truncate(null)).toBe('Sin contenido');
            expect(StringUtils.truncate(undefined)).toBe('Sin contenido');
        });

        test('should use custom suffix', () => {
            expect(StringUtils.truncate('hello world', 8, '>>>')).toBe('hello>>>');
        });
    });

    describe('formatDate', () => {
        test('should return Discord timestamp format', () => {
            const date = new Date('2024-01-15T12:00:00Z');
            const result = StringUtils.formatDate(date, 'f');
            expect(result).toMatch(/<t:\d+:f>/);
        });

        test('should use default format if not specified', () => {
            const date = new Date('2024-01-15T12:00:00Z');
            const result = StringUtils.formatDate(date);
            expect(result).toMatch(/<t:\d+:f>/);
        });
    });

    describe('extractMention', () => {
        test('should extract user ID from mention', () => {
            expect(StringUtils.extractMention('<@123456789>')).toBe('123456789');
            expect(StringUtils.extractMention('<@!123456789>')).toBe('123456789');
        });

        test('should return null for no mention', () => {
            expect(StringUtils.extractMention('hello')).toBeNull();
            expect(StringUtils.extractMention(null)).toBeNull();
        });
    });

    describe('extractRoleMention', () => {
        test('should extract role ID from mention', () => {
            expect(StringUtils.extractRoleMention('<@&123456789>')).toBe('123456789');
        });

        test('should return null for no role mention', () => {
            expect(StringUtils.extractRoleMention('<@123456789>')).toBeNull();
        });
    });

    describe('extractChannelMention', () => {
        test('should extract channel ID from mention', () => {
            expect(StringUtils.extractChannelMention('<#123456789>')).toBe('123456789');
        });

        test('should return null for no channel mention', () => {
            expect(StringUtils.extractChannelMention('<@123456789>')).toBeNull();
        });
    });

    describe('escapeMarkdown', () => {
        test('should escape special characters', () => {
            const result = StringUtils.escapeMarkdown('*bold* and _italic_');
            expect(result).toBe('\\*bold\\* and \\_italic\\_');
        });

        test('should handle null', () => {
            expect(StringUtils.escapeMarkdown(null)).toBe('');
        });
    });

    describe('isValidDiscordId', () => {
        test('should validate Discord IDs (17-19 digits)', () => {
            expect(StringUtils.isValidDiscordId('12345678901234567')).toBe(true);
            expect(StringUtils.isValidDiscordId('1234567890123456789')).toBe(true);
            expect(StringUtils.isValidDiscordId('123')).toBe(false);
            expect(StringUtils.isValidDiscordId('abc')).toBe(false);
        });

        test('should return false for null/empty', () => {
            expect(StringUtils.isValidDiscordId(null)).toBe(false);
            expect(StringUtils.isValidDiscordId('')).toBe(false);
        });
    });

    describe('generateSolicitudeFooter', () => {
        test('should generate footer with user ID and timestamp', () => {
            const footer = StringUtils.generateSolicitudeFooter('123456789');
            expect(footer).toMatch(/^solicitud_123456789_\d+$/);
        });

        test('should include suffix when provided', () => {
            const footer = StringUtils.generateSolicitudeFooter('123456789', 'test');
            expect(footer).toBe('solicitud_123456789_test');
        });
    });

    describe('capitalize', () => {
        test('should capitalize first letter', () => {
            expect(StringUtils.capitalize('hello')).toBe('Hello');
            expect(StringUtils.capitalize('HELLO')).toBe('Hello');
        });

        test('should handle null/empty', () => {
            expect(StringUtils.capitalize(null)).toBe('');
            expect(StringUtils.capitalize('')).toBe('');
        });
    });

    describe('toCamelCase', () => {
        test('should convert to camelCase', () => {
            expect(StringUtils.toCamelCase('hello world')).toBe('helloWorld');
        });
    });

    describe('toKebabCase', () => {
        test('should convert to kebab-case', () => {
            expect(StringUtils.toKebabCase('helloWorld')).toBe('hello-world');
            expect(StringUtils.toKebabCase('hello world')).toBe('hello-world');
        });
    });

    describe('template', () => {
        test('should replace placeholders', () => {
            const result = StringUtils.template('Hello {{name}}!', { name: 'World' });
            expect(result).toBe('Hello World!');
        });

        test('should leave unmatched placeholders', () => {
            const result = StringUtils.template('Hello {{name}}!', {});
            expect(result).toBe('Hello {{name}}!');
        });

        test('should handle null template', () => {
            expect(StringUtils.template(null, {})).toBe('');
        });
    });
});

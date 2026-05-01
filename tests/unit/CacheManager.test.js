/**
 * @fileoverview Tests para CacheManager
 */

'use strict';

const { CacheManager, AuditLogCache, GuildCache } = require('../../src/shared/utils/CacheManager');

describe('CacheManager', () => {
    let cache;

    beforeEach(() => {
        cache = new CacheManager({
            maxSize: 3,
            defaultTtl: 1000,
            evictOnAccess: false
        });
    });

    describe('basic operations', () => {
        test('should set and get value', () => {
            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
        });

        test('should return null for non-existent key', () => {
            expect(cache.get('nonexistent')).toBeNull();
        });

        test('should return null for expired key', async () => {
            cache = new CacheManager({
                maxSize: 10,
                defaultTtl: 50
            });
            cache.set('key1', 'value1');

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(cache.get('key1')).toBeNull();
        });

        test('should delete value', () => {
            cache.set('key1', 'value1');
            expect(cache.delete('key1')).toBe(true);
            expect(cache.get('key1')).toBeNull();
        });

        test('should clear all values', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.clear();
            expect(cache.get('key1')).toBeNull();
            expect(cache.get('key2')).toBeNull();
        });
    });

    describe('has()', () => {
        test('should return true for existing non-expired key', () => {
            cache.set('key1', 'value1');
            expect(cache.has('key1')).toBe(true);
        });

        test('should return false for expired key', async () => {
            cache = new CacheManager({
                maxSize: 10,
                defaultTtl: 50
            });
            cache.set('key1', 'value1');

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(cache.has('key1')).toBe(false);
        });
    });

    describe('LRU eviction', () => {
        test('should evict when max size reached', () => {
            cache.set('key1', 'value1');
            cache.set('key2', 'value2');
            cache.set('key3', 'value3');
            // When adding a 4th item to a cache of maxSize 3, something should be evicted
            cache.set('key4', 'value4');

            // At least one of the original 3 should have been evicted
            const evicted = cache.get('key1') === null || cache.get('key2') === null || cache.get('key3') === null;
            expect(evicted).toBe(true);
            expect(cache.get('key4')).toBe('value4');
        });
    });

    describe('stats', () => {
        test('should track hits and misses', () => {
            cache.set('key1', 'value1');
            cache.get('key1'); // hit
            cache.get('key2'); // miss

            const stats = cache.stats();
            expect(stats.hits).toBe(1);
            expect(stats.misses).toBe(1);
        });

        test('should calculate hit rate', () => {
            cache.set('key1', 'value1');
            cache.get('key1'); // hit
            cache.get('key2'); // miss
            cache.get('key3'); // miss

            const stats = cache.stats();
            expect(stats.hitRate).toBeCloseTo(33.33, 1);
        });

        test('should reset stats', () => {
            cache.set('key1', 'value1');
            cache.get('key1');
            cache.resetStats();

            const stats = cache.stats();
            expect(stats.hits).toBe(0);
            expect(stats.misses).toBe(0);
        });
    });

    describe('cleanup', () => {
        test('should remove expired entries when called', () => {
            const shortCache = new CacheManager({
                maxSize: 10,
                defaultTtl: 10
            });

            shortCache.set('key1', 'value1');
            shortCache.set('key2', 'value2');

            // Wait for items to expire
            return new Promise(resolve => setTimeout(resolve, 50)).then(() => {
                const removed = shortCache.cleanup();
                expect(removed).toBe(2);
                expect(shortCache.stats().size).toBe(0);
            });
        });
    });

    describe('evictOnAccess', () => {
        test('should delete entry on get when evictOnAccess is true', () => {
            cache = new CacheManager({
                maxSize: 10,
                defaultTtl: 10000,
                evictOnAccess: true
            });

            cache.set('key1', 'value1');
            expect(cache.get('key1')).toBe('value1');
            expect(cache.get('key1')).toBeNull();
        });
    });
});

describe('AuditLogCache', () => {
    let auditCache;

    beforeEach(() => {
        auditCache = new AuditLogCache();
    });

    test('should have short default TTL', () => {
        expect(auditCache.defaultTtl).toBe(2000);
    });

    test('should get and set audit logs', () => {
        auditCache.setAuditLog('MESSAGE_DELETE', '123', { test: 'data' });
        expect(auditCache.getAuditLog('MESSAGE_DELETE', '123')).toEqual({ test: 'data' });
    });
});

describe('GuildCache', () => {
    let guildCache;

    beforeEach(() => {
        guildCache = new GuildCache();
    });

    test('should have longer default TTL for guild data', () => {
        expect(guildCache.defaultTtl).toBe(300000);
    });

    test('should get and set channels', () => {
        const mockChannel = { id: '123', name: 'test-channel' };
        guildCache.setChannel('123', mockChannel);
        expect(guildCache.getChannel('123')).toEqual(mockChannel);
    });

    test('should get and set roles', () => {
        const mockRole = { id: '456', name: 'test-role' };
        guildCache.setRole('456', mockRole);
        expect(guildCache.getRole('456')).toEqual(mockRole);
    });
});

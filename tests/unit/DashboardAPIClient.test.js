/**
 * @fileoverview Tests para DashboardAPIClient
 */

'use strict';

const { DashboardAPIClient, CircuitState } = require('../../src/shared/services/DashboardAPIClient');

describe('DashboardAPIClient', () => {
    let client;

    beforeEach(() => {
        client = new DashboardAPIClient({
            apiKey: 'test-api-key',
            baseURL: 'http://localhost:3000/api',
            timeout: 1000,
            retryAttempts: 2,
            retryDelay: 100,
            circuitBreakerThreshold: 3,
            circuitBreakerReset: 1000
        });
    });

    describe('config', () => {
        test('should update configuration', () => {
            client.config({
                apiKey: 'new-key',
                timeout: 5000
            });

            expect(client.apiKey).toBe('new-key');
            expect(client.timeout).toBe(5000);
        });

        test('should enable/disable based on apiKey', () => {
            client.config({ apiKey: '' });
            expect(client._enabled).toBe(false);

            client.config({ apiKey: 'valid-key' });
            expect(client._enabled).toBe(true);
        });
    });

    describe('circuit breaker', () => {
        test('should start in CLOSED state', () => {
            expect(client.getCircuitState().state).toBe(CircuitState.CLOSED);
        });

        test('should track failure count', () => {
            client._recordFailure();
            expect(client.getCircuitState().failureCount).toBe(1);
        });

        test('should open after threshold failures', () => {
            client._recordFailure();
            client._recordFailure();
            client._recordFailure();

            expect(client.getCircuitState().state).toBe(CircuitState.OPEN);
            expect(client._stats.circuitBreakerOpens).toBe(1);
        });

        test('should record success and reset failures', () => {
            client._recordFailure();
            client._recordFailure();
            client._recordSuccess();

            expect(client.getCircuitState().failureCount).toBe(0);
            expect(client.getCircuitState().state).toBe(CircuitState.CLOSED);
        });
    });

    describe('getStats', () => {
        test('should return stats object', () => {
            const stats = client.getStats();

            expect(stats).toHaveProperty('requests');
            expect(stats).toHaveProperty('successes');
            expect(stats).toHaveProperty('failures');
            expect(stats).toHaveProperty('retries');
            expect(stats).toHaveProperty('circuitState');
        });
    });

    describe('reset', () => {
        test('should reset all state', () => {
            client._recordFailure();
            client._recordFailure();
            client._circuitState = CircuitState.OPEN;

            client.reset();

            expect(client._failureCount).toBe(0);
            expect(client._circuitState).toBe(CircuitState.CLOSED);
            expect(client._stats.failures).toBe(0);
        });
    });
});

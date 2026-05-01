/**
 * @fileoverview DashboardAPIClient - Cliente API robusto con retry y circuit breaker
 * @module shared/services/DashboardAPIClient
 * @author Staff Bot System
 * @version 2.0.0
 */

'use strict';

const axios = require('axios');

/**
 * Estados del circuit breaker
 * @readonly
 * @enum {string}
 */
const CircuitState = Object.freeze({
    CLOSED: 'CLOSED',   // Normal operation
    OPEN: 'OPEN',       // Failing, reject requests
    HALF_OPEN: 'HALF_OPEN'  // Testing if service recovered
});

/**
 * @typedef {Object} DashboardAPIOptions
 * @property {string} [apiKey] - API key para autenticación
 * @property {string} [baseURL='http://localhost:3000/api'] - URL base de la API
 * @property {number} [timeout=5000] - Timeout en ms
 * @property {number} [retryAttempts=3] - Número de reintentos
 * @property {number} [retryDelay=1000] - Delay base entre reintentos (ms)
 * @property {number} [circuitBreakerThreshold=5] - Fallos antes de abrir circuit
 * @property {number} [circuitBreakerReset=30000] - Tiempo para resetear circuit (ms)
 */

/**
 * Cliente API robusto con retry automático y circuit breaker
 */
class DashboardAPIClient {
    /**
     * @param {DashboardAPIOptions} options
     */
    constructor(options = {}) {
        /** @type {string} */
        this.apiKey = options.apiKey || '';
        /** @type {string} */
        this.baseURL = options.baseURL || 'http://localhost:3000/api';
        /** @type {number} */
        this.timeout = options.timeout || 5000;
        /** @type {number} */
        this.retryAttempts = options.retryAttempts || 3;
        /** @type {number} */
        this.retryDelay = options.retryDelay || 1000;
        /** @type {number} */
        this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
        /** @type {number} */
        this.circuitBreakerReset = options.circuitBreakerReset || 30000;

        /** @type {string} */
        this._circuitState = CircuitState.CLOSED;
        /** @type {number} */
        this._failureCount = 0;
        /** @type {number} */
        this._lastFailureTime = null;
        /** @type {NodeJS.Timeout|null} */
        this._circuitResetTimeout = null;

        /** @type {Object} */
        this._stats = {
            requests: 0,
            successes: 0,
            failures: 0,
            retries: 0,
            circuitBreakerOpens: 0
        };

        /** @type {boolean} */
        this._enabled = !!this.apiKey;
    }

    /**
     * Configura el cliente
     * @param {DashboardAPIOptions} options
     * @returns {void}
     */
    config(options) {
        if (options.apiKey !== undefined) this.apiKey = options.apiKey;
        if (options.baseURL !== undefined) this.baseURL = options.baseURL;
        if (options.timeout !== undefined) this.timeout = options.timeout;
        if (options.retryAttempts !== undefined) this.retryAttempts = options.retryAttempts;
        if (options.retryDelay !== undefined) this.retryDelay = options.retryDelay;
        if (options.circuitBreakerThreshold !== undefined) this.circuitBreakerThreshold = options.circuitBreakerThreshold;
        if (options.circuitBreakerReset !== undefined) this.circuitBreakerReset = options.circuitBreakerReset;

        this._enabled = !!this.apiKey;
    }

    /**
     * Obtiene headers para requests
     * @private
     * @returns {Object}
     */
    _getHeaders() {
        return {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
        };
    }

    /**
     * Verifica el estado del circuit breaker
     * @private
     * @returns {boolean}
     */
    _checkCircuitBreaker() {
        switch (this._circuitState) {
            case CircuitState.CLOSED:
                return true;

            case CircuitState.OPEN:
                // Check if we should try half-open
                if (Date.now() - this._lastFailureTime >= this.circuitBreakerReset) {
                    this._circuitState = CircuitState.HALF_OPEN;
                    return true;
                }
                return false;

            case CircuitState.HALF_OPEN:
                return true;

            default:
                return true;
        }
    }

    /**
     * Registra un fallo para el circuit breaker
     * @private
     * @returns {void}
     */
    _recordFailure() {
        this._failureCount++;
        this._lastFailureTime = Date.now();

        if (this._circuitState === CircuitState.HALF_OPEN) {
            // Failed in half-open, go back to open
            this._circuitState = CircuitState.OPEN;
            this._scheduleCircuitReset();
        } else if (this._failureCount >= this.circuitBreakerThreshold) {
            this._circuitState = CircuitState.OPEN;
            this._stats.circuitBreakerOpens++;
            this._scheduleCircuitReset();
        }
    }

    /**
     * Registra un éxito para el circuit breaker
     * @private
     * @returns {void}
     */
    _recordSuccess() {
        this._failureCount = 0;
        this._circuitState = CircuitState.CLOSED;

        if (this._circuitResetTimeout) {
            clearTimeout(this._circuitResetTimeout);
            this._circuitResetTimeout = null;
        }
    }

    /**
     * Programa el reset del circuit breaker
     * @private
     * @returns {void}
     */
    _scheduleCircuitReset() {
        if (this._circuitResetTimeout) {
            clearTimeout(this._circuitResetTimeout);
        }

        this._circuitResetTimeout = setTimeout(() => {
            this._circuitState = CircuitState.HALF_OPEN;
        }, this.circuitBreakerReset);
    }

    /**
     * Hace un request con retry y circuit breaker
     * @private
     * @param {string} method - Método HTTP
     * @param {string} endpoint - Endpoint de la API
     * @param {Object} [data] - Datos del body
     * @returns {Promise<Object|null>}
     */
    async _request(method, endpoint, data = null) {
        if (!this._enabled) {
            return null;
        }

        if (!this._checkCircuitBreaker()) {
            console.warn('[DashboardAPI] Circuit breaker open, skipping request');
            return null;
        }

        let lastError = null;
        let attempt = 0;

        while (attempt < this.retryAttempts) {
            try {
                this._stats.requests++;

                const response = await axios({
                    method,
                    url: `${this.baseURL}${endpoint}`,
                    headers: this._getHeaders(),
                    data,
                    timeout: this.timeout
                });

                this._recordSuccess();
                this._stats.successes++;
                return response.data;

            } catch (error) {
                lastError = error;
                attempt++;

                if (attempt < this.retryAttempts) {
                    this._stats.retries++;
                    // Exponential backoff
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        this._recordFailure();
        this._stats.failures++;
        console.error(`[DashboardAPI] Request failed after ${this.retryAttempts} attempts:`, lastError?.message);
        return null;
    }

    /**
     * Crea una nueva solicitud
     * @param {Object} datos
     * @returns {Promise<Object|null>}
     */
    async nuevaSolicitud(datos) {
        return this._request('POST', '/solicitudes', datos);
    }

    /**
     * Actualiza el estado de una solicitud
     * @param {string} id
     * @param {string} estado
     * @returns {Promise<Object|null>}
     */
    async actualizarSolicitud(id, estado) {
        return this._request('PATCH', `/solicitudes/${id}/estado`, { estado });
    }

    /**
     * Crea un log
     * @param {Object} datos
     * @returns {Promise<Object|null>}
     */
    async crearLog(datos) {
        return this._request('POST', '/logs', datos);
    }

    /**
     * Registra un usuario
     * @param {Object} datos
     * @returns {Promise<Object|null>}
     */
    async registrarUsuario(datos) {
        return this._request('POST', '/usuarios', datos);
    }

    /**
     * Actualiza estadísticas
     * @param {string} botId
     * @param {Object} stats
     * @returns {Promise<Object|null>}
     */
    async actualizarStats(botId, stats) {
        return this._request('POST', '/stats', { bot_id: botId, ...stats });
    }

    /**
     * Obtiene el estado del circuit breaker
     * @returns {Object}
     */
    getCircuitState() {
        return {
            state: this._circuitState,
            failureCount: this._failureCount,
            threshold: this.circuitBreakerThreshold
        };
    }

    /**
     * Obtiene estadísticas del cliente
     * @returns {Object}
     */
    getStats() {
        return {
            ...this._stats,
            circuitState: this._circuitState
        };
    }

    /**
     * Resetea el cliente
     * @returns {void}
     */
    reset() {
        this._failureCount = 0;
        this._circuitState = CircuitState.CLOSED;
        this._stats = {
            requests: 0,
            successes: 0,
            failures: 0,
            retries: 0,
            circuitBreakerOpens: 0
        };

        if (this._circuitResetTimeout) {
            clearTimeout(this._circuitResetTimeout);
            this._circuitResetTimeout = null;
        }
    }
}

/**
 * Singleton instance
 * @type {DashboardAPIClient}
 */
const dashboardAPIClient = new DashboardAPIClient();

module.exports = { DashboardAPIClient, dashboardAPIClient, CircuitState };

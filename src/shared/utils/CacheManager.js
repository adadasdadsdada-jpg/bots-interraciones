/**
 * @fileoverview CacheManager - Sistema de caché con TTL y límite de tamaño
 * @module shared/utils/CacheManager
 * @author Staff Bot System
 * @version 2.0.0
 */

'use strict';

/**
 * @typedef {Object} CacheEntry
 * @property {*} value - Valor almacenado
 * @property {number} timestamp - Timestamp de creación
 * @property {number} ttl - TTL en ms
 * @property {number} accessCount - Contador de accesos
 * @property {*} [lastAccess] - Último acceso
 */

/**
 * @typedef {Object} CacheOptions
 * @property {number} [maxSize=1000] - Máximo número de entradas
 * @property {number} [defaultTtl=60000] - TTL por defecto en ms (1 minuto)
 * @property {boolean} [evictOnAccess=false] - Eliminar al acceder
 */

/**
 * Cache con TTL y LRU (Least Recently Used)
 */
class CacheManager {
    /**
     * @param {CacheOptions} options - Opciones de configuración
     */
    constructor(options = {}) {
        /** @type {Map<string, CacheEntry>} */
        this._cache = new Map();
        /** @type {number} */
        this.maxSize = options.maxSize || 1000;
        /** @type {number} */
        this.defaultTtl = options.defaultTtl || 60000;
        /** @type {boolean} */
        this.evictOnAccess = options.evictOnAccess || false;
        /** @type {number} */
        this._hits = 0;
        /** @type {number} */
        this._misses = 0;
    }

    /**
     * Obtiene una entrada del caché
     * @template T
     * @param {string} key - Clave
     * @returns {T|null} Valor o null si no existe o expiró
     */
    get(key) {
        const entry = this._cache.get(key);

        if (!entry) {
            this._misses++;
            return null;
        }

        // Verificar si expiró
        if (this._isExpired(entry)) {
            this._cache.delete(key);
            this._misses++;
            return null;
        }

        this._hits++;
        entry.accessCount++;
        entry.lastAccess = Date.now();

        if (this.evictOnAccess) {
            this._cache.delete(key);
            return entry.value;
        }

        return entry.value;
    }

    /**
     * Establece una entrada en el caché
     * @param {string} key - Clave
     * @param {*} value - Valor
     * @param {number} [ttl] - TTL en ms (usa defaultTtl si no se especifica)
     * @returns {void}
     */
    set(key, value, ttl) {
        // Si el caché está lleno, evict LRU
        if (this._cache.size >= this.maxSize && !this._cache.has(key)) {
            this._evictLRU();
        }

        this._cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: ttl ?? this.defaultTtl,
            accessCount: 0,
            lastAccess: Date.now()
        });
    }

    /**
     * Verifica si una clave existe y no ha expirado
     * @param {string} key - Clave
     * @returns {boolean}
     */
    has(key) {
        const entry = this._cache.get(key);
        if (!entry) return false;
        if (this._isExpired(entry)) {
            this._cache.delete(key);
            return false;
        }
        return true;
    }

    /**
     * Elimina una entrada del caché
     * @param {string} key - Clave
     * @returns {boolean} True si se eliminó
     */
    delete(key) {
        return this._cache.delete(key);
    }

    /**
     * Limpia todo el caché
     * @returns {void}
     */
    clear() {
        this._cache.clear();
    }

    /**
     * Obtiene estadísticas del caché
     * @returns {{size: number, hits: number, misses: number, hitRate: number}}
     */
    stats() {
        const total = this._hits + this._misses;
        return {
            size: this._cache.size,
            maxSize: this.maxSize,
            hits: this._hits,
            misses: this._misses,
            hitRate: total > 0 ? (this._hits / total) * 100 : 0
        };
    }

    /**
     * Resetea las estadísticas
     * @returns {void}
     */
    resetStats() {
        this._hits = 0;
        this._misses = 0;
    }

    /**
     * Limpia entradas expiradas
     * @returns {number} Número de entradas eliminadas
     */
    cleanup() {
        let removed = 0;
        for (const [key, entry] of this._cache.entries()) {
            if (this._isExpired(entry)) {
                this._cache.delete(key);
                removed++;
            }
        }
        return removed;
    }

    /**
     * Verifica si una entrada ha expirado
     * @private
     * @param {CacheEntry} entry
     * @returns {boolean}
     */
    _isExpired(entry) {
        return Date.now() - entry.timestamp > entry.ttl;
    }

    /**
     * Elimina la entrada LRU (Least Recently Used)
     * @private
     * @returns {void}
     */
    _evictLRU() {
        let oldestKey = null;
        let oldestAccess = Number.MAX_SAFE_INTEGER;

        for (const [key, entry] of this._cache.entries()) {
            if (entry.lastAccess < oldestAccess) {
                oldestAccess = entry.lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this._cache.delete(oldestKey);
        }
    }

    /**
     * Ejecuta una función con caché
     * @template T
     * @param {string} key - Clave
     * @param {Function} fetchFn - Función para obtener el valor si no está en caché
     * @param {number} [ttl] - TTL en ms
     * @returns {Promise<T>} Valor
     */
    async getOrFetch(key, fetchFn, ttl) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        const value = await fetchFn();
        this.set(key, value, ttl);
        return value;
    }
}

/**
 * Cache específico para audit logs con TTL corto
 */
class AuditLogCache extends CacheManager {
    constructor() {
        super({
            maxSize: 500,
            defaultTtl: 2000, // 2 segundos para audit logs
            evictOnAccess: false
        });
    }

    /**
     * Obtiene un audit log del caché
     * @param {string} eventType - Tipo de evento
     * @param {string} targetId - ID del objetivo
     * @returns {Object|null}
     */
    getAuditLog(eventType, targetId) {
        const key = `${eventType}-${targetId}`;
        return this.get(key);
    }

    /**
     * Guarda un audit log en caché
     * @param {string} eventType - Tipo de evento
     * @param {string} targetId - ID del objetivo
     * @param {Object} entry - Entrada de audit log
     * @returns {void}
     */
    setAuditLog(eventType, targetId, entry) {
        const key = `${eventType}-${targetId}`;
        this.set(key, entry, 2000);
    }
}

/**
 * Cache para datos de precarga de guild
 */
class GuildCache extends CacheManager {
    constructor() {
        super({
            maxSize: 100,
            defaultTtl: 300000, // 5 minutos
            evictOnAccess: false
        });
    }

    /**
     * Obtiene un canal del guild
     * @param {string} channelId
     * @returns {Object|null}
     */
    getChannel(channelId) {
        return this.get(`channel_${channelId}`);
    }

    /**
     * Guarda un canal del guild
     * @param {string} channelId
     * @param {Object} channel
     * @returns {void}
     */
    setChannel(channelId, channel) {
        this.set(`channel_${channelId}`, channel, 300000);
    }

    /**
     * Obtiene un rol del guild
     * @param {string} roleId
     * @returns {Object|null}
     */
    getRole(roleId) {
        return this.get(`role_${roleId}`);
    }

    /**
     * Guarda un rol del guild
     * @param {string} roleId
     * @param {Object} role
     * @returns {void}
     */
    setRole(roleId, role) {
        this.set(`role_${roleId}`, role, 300000);
    }
}

module.exports = { CacheManager, AuditLogCache, GuildCache };

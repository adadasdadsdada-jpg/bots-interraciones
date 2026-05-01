/**
 * @fileoverview VerificationService - FSM (Finite State Machine) para el sistema de verificación
 * @module shared/services/VerificationService
 * @author Staff Bot System
 * @version 2.0.0
 */

'use strict';

/**
 * Estados posibles del FSM de verificación
 * @readonly
 * @enum {string}
 */
const VerificationState = Object.freeze({
    DORMANT: 'DORMANT',           // Usuario no ha interactuado
    AWAITING_DATA: 'AWAITING_DATA',   // Modal abierto, esperando nombre IC + ID
    AWAITING_ROLE: 'AWAITING_ROLE',   // Datos recibidos, esperando selección de rango
    PENDING_REVIEW: 'PENDING_REVIEW', // Solicitud enviada al canal de revisión
    APPROVED: 'APPROVED',         // Verificación aceptada
    REJECTED: 'REJECTED'          // Verificación denegada
});

/**
 * @typedef {Object} VerificationData
 * @property {string} userId - ID del usuario de Discord
 * @property {string} [nombreIC] - Nombre IC
 * @property {string} [idIC] - ID del personaje
 * @property {string} [discordTag] - Tag de Discord
 * @property {string} [rangoId] - ID del rango seleccionado
 * @property {string} [rangoNombre] - Nombre del rango
 * @property {Date} [requestedAt] - Cuándo se solicitó
 * @property {Date} [reviewedAt] - Cuándo se revisó
 * @property {string} [reviewedBy] - ID de quien revisó
 */

/**
 * @typedef {Object} VerificationResult
 * @property {boolean} success - Si la operación fue exitosa
 * @property {string} [error] - Mensaje de error si falló
 * @property {VerificationState} newState - Nuevo estado del FSM
 */

/**
 * FSM para el sistema de verificación de staff
 */
class VerificationService {
    /**
     * @param {Object} options - Opciones de configuración
     * @param {Logger} options.logger - Instancia de logger
     * @param {Object} options.configManager - Instancia de ConfigManager
     */
    constructor(options) {
        /** @type {Logger} */
        this.logger = options.logger;
        /** @type {Object} */
        this.configManager = options.configManager;

        /** @type {Map<string, VerificationData>} */
        this._pendingVerifications = new Map();

        /** @type {Map<string, VerificationData>} */
        this._userRegistry = new Map();

        /** @type {Map<string, boolean>} */
        this._customNicknames = new Map();

        /** @type {number} */
        this._verificationTimeout = 300000; // 5 minutos
    }

    /**
     * Obtiene los datos de verificación pendientes para un usuario
     * @param {string} userId
     * @returns {VerificationData|null}
     */
    getPendingVerification(userId) {
        return this._pendingVerifications.get(userId) || null;
    }

    /**
     * Obtiene los datos registrados de un usuario
     * @param {string} userId
     * @returns {VerificationData|null}
     */
    getRegisteredUser(userId) {
        return this._userRegistry.get(userId) || null;
    }

    /**
     * Verifica si un usuario tiene nickname personalizado
     * @param {string} userId
     * @returns {boolean}
     */
    hasCustomNickname(userId) {
        return this._customNicknames.has(userId);
    }

    /**
     * Registra que un usuario eligió nickname personalizado
     * @param {string} userId
     * @returns {void}
     */
    setCustomNickname(userId) {
        this._customNicknames.set(userId, true);
        this.logger.debug(`Nickname personalizado activado para ${userId}`, 'VerificationService');
    }

    /**
     * Elimina la preferencia de nickname personalizado
     * @param {string} userId
     * @returns {void}
     */
    clearCustomNickname(userId) {
        this._customNicknames.delete(userId);
        this.logger.debug(`Nickname personalizado removido para ${userId}`, 'VerificationService');
    }

    /**
     * Inicia el proceso de verificación (usuario hace click en botón)
     * @param {string} userId
     * @param {string} discordTag
     * @returns {VerificationResult}
     */
    startVerification(userId, discordTag) {
        // Si ya está en proceso, no reiniciar
        const existing = this._pendingVerifications.get(userId);
        if (existing && existing.state !== VerificationState.DORMANT) {
            return {
                success: false,
                error: 'Ya tienes una verificación en proceso',
                newState: existing.state
            };
        }

        this._pendingVerifications.set(userId, {
            userId,
            discordId: userId, // Discord ID es igual al userId
            discordTag,
            state: VerificationState.AWAITING_DATA
        });

        this.logger.debug(`Verificación iniciada por ${userId}`, 'VerificationService');

        return {
            success: true,
            newState: VerificationState.AWAITING_DATA
        };
    }

    /**
     * Registra los datos del formulario (nombre IC e ID)
     * @param {string} userId
     * @param {string} nombreIC
     * @param {string} idIC
     * @returns {VerificationResult}
     */
    submitVerificationData(userId, nombreIC, idIC) {
        const pending = this._pendingVerifications.get(userId);

        if (!pending) {
            return {
                success: false,
                error: 'No hay verificación en proceso',
                newState: VerificationState.DORMANT
            };
        }

        if (pending.state !== VerificationState.AWAITING_DATA) {
            return {
                success: false,
                error: 'Estado inválido para recibir datos',
                newState: pending.state
            };
        }

        pending.nombreIC = nombreIC;
        pending.idIC = idIC;
        pending.state = VerificationState.AWAITING_ROLE;

        this.logger.debug(`Datos recibidos de ${userId}: ${nombreIC}, ${idIC}`, 'VerificationService');

        return {
            success: true,
            newState: VerificationState.AWAITING_ROLE
        };
    }

    /**
     * Registra el rango seleccionado y envía la solicitud
     * @param {string} userId
     * @param {string} rangoId
     * @param {string} rangoNombre
     * @returns {VerificationResult}
     */
    submitRango(userId, rangoId, rangoNombre) {
        const pending = this._pendingVerifications.get(userId);

        if (!pending) {
            return {
                success: false,
                error: 'No hay verificación en proceso',
                newState: VerificationState.DORMANT
            };
        }

        if (pending.state !== VerificationState.AWAITING_ROLE) {
            return {
                success: false,
                error: 'Estado inválido para recibir rango',
                newState: pending.state
            };
        }

        pending.rangoId = rangoId;
        pending.rangoNombre = rangoNombre;
        pending.requestedAt = new Date();
        pending.state = VerificationState.PENDING_REVIEW;

        this.logger.debug(`Rango seleccionado por ${userId}: ${rangoNombre}`, 'VerificationService');

        return {
            success: true,
            newState: VerificationState.PENDING_REVIEW
        };
    }

    /**
     * Aprueba una solicitud de verificación
     * @param {string} reviewerId - ID de quien aprueba
     * @param {string} userId - ID del usuario aprobado
     * @returns {VerificationResult}
     */
    approveVerification(reviewerId, userId) {
        const pending = this._pendingVerifications.get(userId);

        if (!pending) {
            return {
                success: false,
                error: 'No hay verificación pendiente',
                newState: VerificationState.DORMANT
            };
        }

        if (pending.state !== VerificationState.PENDING_REVIEW) {
            return {
                success: false,
                error: 'Estado inválido para aprobar',
                newState: pending.state
            };
        }

        // Registrar usuario
        this._userRegistry.set(userId, {
            userId,
            nombreIC: pending.nombreIC,
            idIC: pending.idIC,
            rango: pending.rangoNombre,
            discordTag: pending.discordTag,
            registeredAt: new Date(),
            updatedAt: new Date()
        });

        pending.state = VerificationState.APPROVED;
        pending.reviewedAt = new Date();
        pending.reviewedBy = reviewerId;

        this.logger.info(`Verificación aprobada: ${userId} (${pending.nombreIC}) por ${reviewerId}`, 'VerificationService');

        return {
            success: true,
            newState: VerificationState.APPROVED
        };
    }

    /**
     * Rechaza una solicitud de verificación
     * @param {string} reviewerId - ID de quien rechaza
     * @param {string} userId - ID del usuario rechazado
     * @returns {VerificationResult}
     */
    rejectVerification(reviewerId, userId) {
        const pending = this._pendingVerifications.get(userId);

        if (!pending) {
            return {
                success: false,
                error: 'No hay verificación pendiente',
                newState: VerificationState.DORMANT
            };
        }

        if (pending.state !== VerificationState.PENDING_REVIEW) {
            return {
                success: false,
                error: 'Estado inválido para rechazar',
                newState: pending.state
            };
        }

        pending.state = VerificationState.REJECTED;
        pending.reviewedAt = new Date();
        pending.reviewedBy = reviewerId;

        this.logger.info(`Verificación rechazada: ${userId} por ${reviewerId}`, 'VerificationService');

        return {
            success: true,
            newState: VerificationState.REJECTED
        };
    }

    /**
     * Resetea el estado de verificación de un usuario (para reintentar)
     * @param {string} userId
     * @returns {VerificationResult}
     */
    resetVerification(userId) {
        const pending = this._pendingVerifications.get(userId);

        if (pending && pending.state === VerificationState.REJECTED) {
            pending.state = VerificationState.DORMANT;
            delete pending.nombreIC;
            delete pending.idIC;
            delete pending.rangoId;
            delete pending.rangoNombre;
            delete pending.requestedAt;
            delete pending.reviewedAt;
            delete pending.reviewedBy;

            this.logger.debug(`Verificación reseteada para ${userId}`, 'VerificationService');

            return {
                success: true,
                newState: VerificationState.DORMANT
            };
        }

        return {
            success: false,
            error: 'No se puede resetear',
            newState: pending?.state || VerificationState.DORMANT
        };
    }

    /**
     * Limpia verificaciones expiradas
     * @returns {number} Número de verificaciones limpiadas
     */
    cleanupExpired() {
        const now = Date.now();
        let cleaned = 0;

        for (const [userId, pending] of this._pendingVerifications.entries()) {
            if (pending.requestedAt && now - pending.requestedAt.getTime() > this._verificationTimeout) {
                this._pendingVerifications.delete(userId);
                cleaned++;
                this.logger.debug(`Verificación expirada eliminada: ${userId}`, 'VerificationService');
            }
        }

        return cleaned;
    }

    /**
     * Verifica si un miembro tiene permisos de verificación
     * @param {Object} member - GuildMember de Discord
     * @returns {boolean}
     */
    hasVerificationPermission(member) {
        if (!member) return false;
        return member.roles.cache.some(rol =>
            this.configManager.verificacionAutorizados.includes(rol.id)
        );
    }

    /**
     * Verifica si un rol puede aprobar a otro según la jerarquía
     * @param {Object} reviewerRole - Rol del aprobador
     * @param {string} rangoSolicitado - Rango que se solicita
     * @returns {boolean}
     */
    canApproveRango(reviewerRole, rangoSolicitado) {
        const jerarquiaEntry = this.configManager.jerarquia.find(
            entry => entry.id === reviewerRole.id
        );

        if (!jerarquiaEntry) return false;
        return jerarquiaEntry.puedeAceptar.includes(rangoSolicitado);
    }

    /**
     * Obtiene estadísticas del servicio
     * @returns {Object}
     */
    getStats() {
        const stateCounts = {};
        for (const state of Object.values(VerificationState)) {
            stateCounts[state] = 0;
        }

        for (const pending of this._pendingVerifications.values()) {
            stateCounts[pending.state]++;
        }

        return {
            pending: this._pendingVerifications.size,
            registered: this._userRegistry.size,
            customNicknames: this._customNicknames.size,
            byState: stateCounts
        };
    }

    /**
     * Serializa el estado para persistencia
     * @returns {Object}
     */
    serialize() {
        return {
            pendingVerifications: Array.from(this._pendingVerifications.entries()),
            userRegistry: Array.from(this._userRegistry.entries()),
            customNicknames: Array.from(this._customNicknames.entries())
        };
    }

    /**
     * Restaura el estado desde persistencia
     * @param {Object} data
     */
    restore(data) {
        if (data.pendingVerifications) {
            this._pendingVerifications = new Map(data.pendingVerifications);
        }
        if (data.userRegistry) {
            this._userRegistry = new Map(data.userRegistry);
        }
        if (data.customNicknames) {
            this._customNicknames = new Map(data.customNicknames);
        }
    }
}

module.exports = { VerificationService, VerificationState };

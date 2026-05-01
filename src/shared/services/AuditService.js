/**
 * @fileoverview AuditService - Servicio de auditoría con buffering y batching
 * @module shared/services/AuditService
 * @author Staff Bot System
 * @version 2.0.0
 */

'use strict';

const { EmbedFactory } = require('../utils/EmbedFactory');
const { CacheManager } = require('../utils/CacheManager');
const { formatDateLocal, truncate } = require('../utils/StringUtils');

/**
 * Tipos de eventos de auditoría
 * @readonly
 * @enum {string}
 */
const AuditEventType = Object.freeze({
    // Mensajes
    MESSAGE_CREATE: 'MESSAGE_CREATE',
    MESSAGE_UPDATE: 'MESSAGE_UPDATE',
    MESSAGE_DELETE: 'MESSAGE_DELETE',

    // Miembros
    MEMBER_JOIN: 'MEMBER_JOIN',
    MEMBER_LEAVE: 'MEMBER_LEAVE',
    MEMBER_KICK: 'MEMBER_KICK',
    MEMBER_BAN: 'MEMBER_BAN',
    MEMBER_UNBAN: 'MEMBER_UNBAN',
    NICKNAME_CHANGE: 'NICKNAME_CHANGE',

    // Roles
    ROLE_ADD: 'ROLE_ADD',
    ROLE_REMOVE: 'ROLE_REMOVE',

    // Canales
    CHANNEL_CREATE: 'CHANNEL_CREATE',
    CHANNEL_DELETE: 'CHANNEL_DELETE',
    CHANNEL_UPDATE: 'CHANNEL_UPDATE',

    // Guild
    GUILD_UPDATE: 'GUILD_UPDATE',

    // Comandos
    COMMAND_EXECUTE: 'COMMAND_EXECUTE',

    // Verificación
    VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
    VERIFICATION_REJECTED: 'VERIFICATION_REJECTED'
});

/**
 * @typedef {Object} AuditEntry
 * @property {string} type - Tipo de evento
 * @property {Object} data - Datos del evento
 * @property {Date} timestamp - Cuándo ocurrió
 * @property {string} [executorId] - ID de quien lo ejecutó
 * @property {string} [targetId] - ID del objetivo
 */

/**
 * Servicio de auditoría con buffering para optimizar writes
 */
class AuditService {
    /**
     * @param {Object} options
     * @param {Logger} options.logger
     * @param {Object} options.configManager
     * @param {Object} options.cacheManager - Caché para audit logs
     */
    constructor(options) {
        /** @type {Logger} */
        this.logger = options.logger;
        /** @type {Object} */
        this.configManager = options.configManager;
        /** @type {CacheManager} */
        this.auditCache = options.cacheManager || new CacheManager({ maxSize: 500, defaultTtl: 2000 });

        /** @type {AuditEntry[]} */
        this._buffer = [];
        /** @type {number} */
        this._bufferSize = 0;
        /** @type {NodeJS.Timeout|null} */
        this._flushInterval = null;
        /** @type {number} */
        this._maxBufferSize = 100;
        /** @type {number} */
        this._flushIntervalMs = 5000;

        /** @type {Object} */
        this._stats = {
            eventsLogged: 0,
            eventsByType: {},
            errors: 0
        };

        this._startFlushInterval();
    }

    /**
     * Inicia el interval de flush
     * @private
     * @returns {void}
     */
    _startFlushInterval() {
        this._flushInterval = setInterval(() => {
            this._flush();
        }, this._flushIntervalMs);
    }

    /**
     * Hace flush del buffer al log
     * @private
     * @returns {void}
     */
    _flush() {
        if (this._buffer.length === 0) return;

        const entries = this._buffer.splice(0);
        this._bufferSize = 0;

        for (const entry of entries) {
            this._writeEntry(entry);
        }
    }

    /**
     * Escribe una entrada al log
     * @private
     * @param {AuditEntry} entry
     * @returns {void}
     */
    _writeEntry(entry) {
        try {
            this.logger.debug(`Audit: ${entry.type}`, 'AuditService', {
                executorId: entry.executorId,
                targetId: entry.targetId
            });
            this._stats.eventsLogged++;
            this._stats.eventsByType[entry.type] = (this._stats.eventsByType[entry.type] || 0) + 1;
        } catch (err) {
            this._stats.errors++;
            this.logger.error('Error escribiendo audit entry', err, 'AuditService');
        }
    }

    /**
     * Añade un evento al buffer
     * @param {AuditEntry} entry
     * @returns {void}
     */
    log(entry) {
        this._buffer.push(entry);
        this._bufferSize++;

        if (this._bufferSize >= this._maxBufferSize) {
            this._flush();
        }
    }

    /**
     * Obtiene el color para un tipo de evento
     * @private
     * @param {string} eventType
     * @returns {number}
     */
    _getColorForEvent(eventType) {
        const colors = this.configManager.colors;
        const colorMap = {
            [AuditEventType.MESSAGE_CREATE]: colors.messageCreate,
            [AuditEventType.MESSAGE_UPDATE]: colors.messageUpdate,
            [AuditEventType.MESSAGE_DELETE]: colors.messageDelete,
            [AuditEventType.MEMBER_JOIN]: colors.memberJoin,
            [AuditEventType.MEMBER_LEAVE]: colors.memberLeave,
            [AuditEventType.MEMBER_KICK]: colors.memberKick,
            [AuditEventType.MEMBER_BAN]: colors.memberBan,
            [AuditEventType.MEMBER_UNBAN]: colors.memberUnban,
            [AuditEventType.NICKNAME_CHANGE]: colors.nickname,
            [AuditEventType.ROLE_ADD]: colors.roleAdd,
            [AuditEventType.ROLE_REMOVE]: colors.roleRemove,
            [AuditEventType.CHANNEL_CREATE]: colors.channelCreate,
            [AuditEventType.CHANNEL_DELETE]: colors.channelDelete,
            [AuditEventType.CHANNEL_UPDATE]: colors.channelUpdate,
            [AuditEventType.GUILD_UPDATE]: colors.serverUpdate,
            [AuditEventType.COMMAND_EXECUTE]: colors.commandExecute,
            [AuditEventType.VERIFICATION_APPROVED]: colors.success,
            [AuditEventType.VERIFICATION_REJECTED]: colors.error
        };

        return colorMap[eventType] || 0x808080;
    }

    /**
     * Crea un embed de log para un evento
     * @param {string} eventType
     * @param {Object} data
     * @returns {EmbedBuilder|null}
     */
    createLogEmbed(eventType, data) {
        const color = this._getColorForEvent(eventType);

        switch (eventType) {
            case AuditEventType.MESSAGE_CREATE:
                return EmbedFactory.messageCreate(data.message, color, truncate);

            case AuditEventType.MESSAGE_UPDATE:
                return EmbedFactory.messageUpdate(data.oldMessage, data.newMessage, color, truncate);

            case AuditEventType.MESSAGE_DELETE:
                return EmbedFactory.messageDelete(data.message, data.author, color, truncate);

            case AuditEventType.MEMBER_JOIN:
                return EmbedFactory.memberJoin(data.member, color);

            case AuditEventType.ROLE_ADD:
                return EmbedFactory.roleAdd(data.member, data.role, data.executor, color);

            case AuditEventType.ROLE_REMOVE:
                return EmbedFactory.roleRemove(data.member, data.role, data.executor, color);

            case AuditEventType.COMMAND_EXECUTE:
                return EmbedFactory.slashCommand(data.interaction, color);

            default:
                this.logger.debug(`No embed template for event type: ${eventType}`, 'AuditService');
                return null;
        }
    }

    /**
     * Envía un log a un canal
     * @param {Object} discordClient - Cliente de Discord
     * @param {string} channelId - ID del canal
     * @param {Object} embed - Embed a enviar
     * @returns {Promise<void>}
     */
    async sendLog(discordClient, channelId, embed) {
        if (!discordClient || !channelId || !embed) return;

        try {
            await discordClient.sendToChannel(channelId, { embeds: [embed] });
        } catch (err) {
            this.logger.error(`Error enviando log a canal ${channelId}`, err, 'AuditService');
        }
    }

    /**
     * Loggea un mensaje creado
     * @param {Object} message
     * @returns {void}
     */
    logMessageCreate(message) {
        this.log({
            type: AuditEventType.MESSAGE_CREATE,
            data: { message },
            timestamp: new Date(),
            targetId: message.author?.id
        });
    }

    /**
     * Loggea un mensaje editado
     * @param {Object} oldMessage
     * @param {Object} newMessage
     * @returns {void}
     */
    logMessageUpdate(oldMessage, newMessage) {
        this.log({
            type: AuditEventType.MESSAGE_UPDATE,
            data: { oldMessage, newMessage },
            timestamp: new Date(),
            targetId: newMessage.author?.id
        });
    }

    /**
     * Loggea un mensaje eliminado
     * @param {Object} message
     * @param {Object} author
     * @returns {void}
     */
    logMessageDelete(message, author) {
        this.log({
            type: AuditEventType.MESSAGE_DELETE,
            data: { message, author },
            timestamp: new Date(),
            targetId: message.author?.id
        });
    }

    /**
     * Loggea entrada de miembro
     * @param {Object} member
     * @returns {void}
     */
    logMemberJoin(member) {
        this.log({
            type: AuditEventType.MEMBER_JOIN,
            data: { member },
            timestamp: new Date(),
            targetId: member.user.id
        });
    }

    /**
     * Loggea salida de miembro
     * @param {Object} member
     * @param {boolean} wasKicked
     * @param {Object} [kickedBy]
     * @returns {void}
     */
    logMemberLeave(member, wasKicked = false, kickedBy = null) {
        this.log({
            type: wasKicked ? AuditEventType.MEMBER_KICK : AuditEventType.MEMBER_LEAVE,
            data: { member, wasKicked, kickedBy },
            timestamp: new Date(),
            targetId: member.user.id,
            executorId: kickedBy?.id
        });
    }

    /**
     * Loggea cambio de rol
     * @param {Object} member
     * @param {Object} role
     * @param {boolean} wasAdded
     * @param {Object} [executor]
     * @returns {void}
     */
    logRoleChange(member, role, wasAdded, executor = null) {
        this.log({
            type: wasAdded ? AuditEventType.ROLE_ADD : AuditEventType.ROLE_REMOVE,
            data: { member, role, executor },
            timestamp: new Date(),
            targetId: member.user.id,
            executorId: executor?.id
        });
    }

    /**
     * Loggea ejecución de comando
     * @param {Object} interaction
     * @returns {void}
     */
    logCommandExecute(interaction) {
        this.log({
            type: AuditEventType.COMMAND_EXECUTE,
            data: { interaction },
            timestamp: new Date(),
            executorId: interaction.user?.id,
            targetId: interaction.channel?.id
        });
    }

    /**
     * Obtiene estadísticas
     * @returns {Object}
     */
    getStats() {
        return {
            ...this._stats,
            bufferSize: this._buffer.length
        };
    }

    /**
     * Destruye el servicio, hace flush final
     * @returns {Promise<void>}
     */
    async destroy() {
        this._flush();

        if (this._flushInterval) {
            clearInterval(this._flushInterval);
            this._flushInterval = null;
        }
    }
}

module.exports = { AuditService, AuditEventType };

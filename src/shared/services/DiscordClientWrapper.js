/**
 * @fileoverview DiscordClientWrapper - Wrapper para Discord.js con reconnect automático y manejo de errores
 * @module shared/services/DiscordClientWrapper
 * @author Staff Bot System
 * @version 2.0.0
 */

'use strict';

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { Logger } = require('../utils/Logger');
const { GuildCache } = require('../utils/CacheManager');

/**
 * @typedef {Object} DiscordClientOptions
 * @property {string} token - Token del bot
 * @property {string} botName - Nombre para logs
 * @property {string} serverId - ID del servidor
 * @property {Logger} logger - Instancia de logger
 * @property {number} [reconnectDelay=5000] - Delay entre intentos de reconnect (ms)
 * @property {number} [maxReconnectAttempts=10] - Máximo de intentos
 */

/**
 * Wrapper para Discord.js Client con características de robustez
 */
class DiscordClientWrapper {
    /**
     * @param {DiscordClientOptions} options
     */
    constructor(options) {
        /** @type {string} */
        this.token = options.token;
        /** @type {string} */
        this.botName = options.botName;
        /** @type {string} */
        this.serverId = options.serverId;
        /** @type {Logger} */
        this.logger = options.logger || new Logger({ botName: this.botName });
        /** @type {number} */
        this.reconnectDelay = options.reconnectDelay || 5000;
        /** @type {number} */
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;

        /** @type {Client} */
        this.client = null;
        /** @type {GuildCache} */
        this.guildCache = new GuildCache();
        /** @type {boolean} */
        this.isReady = false;
        /** @type {number} */
        this.reconnectAttempts = 0;
        /** @type {boolean} */
        this._destroyed = false;

        // Event handlers configurables
        /** @type {Map<string, Function>} */
        this._eventHandlers = new Map();

        this._initializeClient();
    }

    /**
     * Inicializa el cliente de Discord
     * @private
     * @returns {void}
     */
    _initializeClient() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildModeration,
                GatewayIntentBits.MessageContent
            ],
            partials: [
                Partials.Message,
                Partials.Channel,
                Partials.Reaction,
                Partials.GuildMember,
                Partials.User
            ]
        });

        this._setupInternalHandlers();
    }

    /**
     * Configura los handlers internos
     * @private
     * @returns {void}
     */
    _setupInternalHandlers() {
        // Ready event (clientReady for Discord.js v15+)
        this.client.once('clientReady', async () => {
            this.isReady = true;
            this.reconnectAttempts = 0;
            this.logger.info(`Bot conectado: ${this.client.user.tag}`, 'DiscordClient');

            // Precargar datos del guild
            await this._precacheGuildData();

            // Configurar presencia
            await this.client.user.setPresence({
                activities: [{ name: '🛡️ Verificación Staff', type: 3 }],
                status: 'online'
            });

            this.logger.info(`Datos precargados - Canales: ${Object.keys(this.guildCache).length}`, 'DiscordClient');
        });

        // Reconnection handling
        this.client.on('disconnect', (event) => {
            this.isReady = false;
            this.logger.warn(`Desconectado del gateway. Código: ${event.code}`, 'DiscordClient');
            this._attemptReconnect();
        });

        this.client.on('shardDisconnect', (event, shardId) => {
            this.isReady = false;
            this.logger.warn(`Shard ${shardId} desconectado. Código: ${event.code}`, 'DiscordClient');
            this._attemptReconnect();
        });

        this.client.on('shardError', (error, shardId) => {
            this.logger.error(`Error en shard ${shardId}`, error, 'DiscordClient');
        });

        this.client.on('error', (error) => {
            this.logger.error('Error de WebSocket', error, 'DiscordClient');
        });

        this.client.on('invalidated', () => {
            this.logger.warn('Sesión invalidada, recargando...', 'DiscordClient');
            this.isReady = false;
            this._attemptReconnect();
        });

        // Rate limit handling
        this.client.on('rateLimit', (rateLimitInfo) => {
            this.logger.warn(`Rate limit alcanzado: ${JSON.stringify(rateLimitInfo)}`, 'DiscordClient');
        });

        // Log all events para debug
        this.client.on('debug', (info) => {
            if (info.includes('Heartbeat') || info.includes('Connecting')) {
                this.logger.debug(info, 'DiscordClient');
            }
        });
    }

    /**
     * Intenta reconectar con backoff exponencial
     * @private
     * @returns {void}
     */
    _attemptReconnect() {
        if (this._destroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                this.logger.fatal(`Máximo de intentos de reconnect alcanzados (${this.maxReconnectAttempts})`, null, 'DiscordClient');
            }
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1); // Exponential backoff

        this.logger.info(
            `Intentando reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${delay}ms`,
            'DiscordClient'
        );

        setTimeout(async () => {
            try {
                await this.client.login(this.token);
            } catch (err) {
                this.logger.error('Error en reconnect', err, 'DiscordClient');
                this._attemptReconnect();
            }
        }, delay);
    }

    /**
     * Pre-carga datos del guild
     * @private
     * @returns {Promise<void>}
     */
    async _precacheGuildData() {
        const guild = this.client.guilds.cache.get(this.serverId);
        if (!guild) {
            this.logger.warn(`Guild ${this.serverId} no encontrado`, 'DiscordClient');
            return;
        }

        try {
            const [fetchedChannels, fetchedRoles, fetchedMembers] = await Promise.all([
                guild.channels.fetch(),
                guild.roles.fetch(),
                guild.members.fetch()
            ]);

            for (const [id, channel] of fetchedChannels) {
                if (channel.isTextBased()) {
                    this.guildCache.setChannel(id, channel);
                }
            }

            for (const [id, role] of fetchedRoles) {
                this.guildCache.setRole(id, role);
            }

            this.logger.info(`Precargado: ${fetchedChannels.size} canales, ${fetchedRoles.size} roles, ${fetchedMembers.size} miembros`, 'DiscordClient');
        } catch (err) {
            this.logger.error('Error precargando datos del guild', err, 'DiscordClient');
        }
    }

    /**
     * Registra un handler para un evento
     * @param {string} eventName - Nombre del evento
     * @param {Function} handler - Función handler
     * @returns {void}
     */
    on(eventName, handler) {
        this._eventHandlers.set(eventName, handler);
        this.client.on(eventName, handler);
        this.logger.debug(`Handler registrado para evento: ${eventName}`, 'DiscordClient');
    }

    /**
     * Registra un handler para un evento que solo se ejecuta una vez
     * @param {string} eventName - Nombre del evento
     * @param {Function} handler - Función handler
     * @returns {void}
     */
    once(eventName, handler) {
        this.client.once(eventName, handler);
    }

    /**
     * Inicia sesión con Discord
     * @returns {Promise<void>}
     */
    async login() {
        try {
            this.logger.info(`Iniciando sesión como ${this.botName}...`, 'DiscordClient');
            await this.client.login(this.token);
        } catch (err) {
            this.logger.error('Error al iniciar sesión', err, 'DiscordClient');
            throw err;
        }
    }

    /**
     * Obtiene el guild cacheado
     * @returns {Object|null}
     */
    getGuild() {
        return this.client.guilds.cache.get(this.serverId) || null;
    }

    /**
     * Obtiene un canal del caché
     * @param {string} channelId
     * @returns {Object|null}
     */
    getChannel(channelId) {
        return this.guildCache.getChannel(channelId);
    }

    /**
     * Obtiene un rol del caché
     * @param {string} roleId
     * @returns {Object|null}
     */
    getRole(roleId) {
        return this.guildCache.getRole(roleId);
    }

    /**
     * Obtiene un miembro del guild
     * @param {string} memberId
     * @returns {Promise<Object|null>}
     */
    async getMember(memberId) {
        const guild = this.getGuild();
        if (!guild) return null;

        try {
            return await guild.members.fetch(memberId);
        } catch (err) {
            this.logger.debug(`No se pudo fetchear miembro ${memberId}`, 'DiscordClient');
            return null;
        }
    }

    /**
     * Envía un mensaje a un canal
     * @param {string} channelId - ID del canal
     * @param {Object} options - Opciones del mensaje
     * @returns {Promise<Object|null>}
     */
    async sendToChannel(channelId, options) {
        const channel = this.getChannel(channelId);
        if (!channel) {
            this.logger.warn(`Canal ${channelId} no encontrado en caché`, 'DiscordClient');
            return null;
        }

        try {
            return await channel.send(options);
        } catch (err) {
            this.logger.error(`Error enviando a canal ${channelId}`, err, 'DiscordClient');
            return null;
        }
    }

    /**
     * Crea un comando de aplicación
     * @param {Object} commandData - Datos del comando
     * @returns {Promise<Object|null>}
     */
    async createCommand(commandData) {
        const guild = this.getGuild();
        if (!guild) {
            this.logger.warn('Guild no disponible para crear comando', 'DiscordClient');
            return null;
        }

        try {
            return await guild.commands.create(commandData);
        } catch (err) {
            this.logger.error('Error creando comando', err, 'DiscordClient');
            return null;
        }
    }

    /**
     * Registra múltiples comandos de aplicación
     * @param {Array<Object>} commands - Array de comandos
     * @returns {Promise<void>}
     */
    async registerCommands(commands) {
        const guild = this.getGuild();
        if (!guild) return;

        for (const cmd of commands) {
            try {
                await guild.commands.create(cmd);
                this.logger.info(`Comando /${cmd.name} creado`, 'DiscordClient');
            } catch (err) {
                this.logger.error(`Error creando comando /${cmd.name}`, err, 'DiscordClient');
            }
        }
    }

    /**
     * Destruye el cliente y limpia recursos
     * @returns {Promise<void>}
     */
    async destroy() {
        this._destroyed = true;

        // Remover todos los handlers
        for (const [eventName, handler] of this._eventHandlers) {
            this.client.removeListener(eventName, handler);
        }
        this._eventHandlers.clear();

        // Destruir caché
        this.guildCache.clear();

        // Destruir cliente
        if (this.client) {
            this.client.destroy();
        }

        this.logger.info('Cliente destruido', 'DiscordClient');
    }
}

module.exports = { DiscordClientWrapper };

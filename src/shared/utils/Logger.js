/**
 * @fileoverview Logger - Sistema de logging estructurado con múltiples transports
 * @module shared/utils/Logger
 * @author Staff Bot System
 * @version 2.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Niveles de log
 * @readonly
 * @enum {number}
 */
const LOG_LEVELS = Object.freeze({
    TRACE: 0,
    DEBUG: 1,
    INFO: 2,
    WARN: 3,
    ERROR: 4,
    FATAL: 5
});

/**
 * Nombres de niveles para output
 * @type {Object.<number, string>}
 */
const LEVEL_NAMES = Object.freeze({
    [LOG_LEVELS.TRACE]: 'TRACE',
    [LOG_LEVELS.DEBUG]: 'DEBUG',
    [LOG_LEVELS.INFO]: 'INFO',
    [LOG_LEVELS.WARN]: 'WARN',
    [LOG_LEVELS.ERROR]: 'ERROR',
    [LOG_LEVELS.FATAL]: 'FATAL'
});

/**
 * @typedef {Object} LogEntry
 * @property {string} timestamp - ISO8601 timestamp
 * @property {string} level - Nombre del nivel
 * @property {string} message - Mensaje principal
 * @property {string} [context] - Contexto adicional
 * @property {string} [traceId] - ID de traza
 * @property {string} [botName] - Nombre del bot
 * @property {Object} [data] - Datos adicionales
 * @property {string} [error] - Mensaje de error
 * @property {string} [stack] - Stack trace si hay error
 */

/**
 * @typedef {Object} LoggerOptions
 * @property {string} logDir - Directorio para logs de archivo
 * @property {string} botName - Nombre del bot para identificar logs
 * @property {string} minLevel - Nivel mínimo de log (default: INFO)
 * @property {boolean} console - Habilitar logs en consola
 * @property {boolean} file - Habilitar logs en archivo
 * @property {number} maxFileSize - Tamaño máximo de archivo en bytes
 * @property {number} maxFiles - Número máximo de archivos a retener
 */

class Logger {
    /**
     * @param {LoggerOptions} options - Opciones de configuración
     */
    constructor(options = {}) {
        /** @type {string} */
        this.botName = options.botName || 'Bot';
        /** @type {string} */
        this.logDir = options.logDir || './logs';
        /** @type {number} */
        this.minLevel = LOG_LEVELS[options.minLevel?.toUpperCase()] ?? LOG_LEVELS.INFO;
        /** @type {boolean} */
        this.consoleEnabled = options.console !== false;
        /** @type {boolean} */
        this.fileEnabled = options.file !== false;
        /** @type {string|null} */
        this.traceId = null;
        /** @type {string[]} */
        this._buffer = [];
        /** @type {number} */
        this._bufferSize = 0;
        /** @type {NodeJS.Timeout|null} */
        this._flushInterval = null;
        /** @type {boolean} */
        this._destroyed = false;

        if (this.fileEnabled) {
            this._ensureLogDir();
            this._startFlushInterval();
        }
    }

    /**
     * Establece un traceId para todas las entradas de log subsecuentes
     * @param {string} traceId
     * @returns {void}
     */
    setTraceId(traceId) {
        this.traceId = traceId;
    }

    /**
     * Crea un entry de log formateado
     * @private
     * @param {number} level - Nivel de log
     * @param {string} message - Mensaje
     * @param {string} [context] - Contexto
     * @param {Object} [data] - Datos adicionales
     * @returns {LogEntry}
     */
    _createEntry(level, message, context, data) {
        /** @type {LogEntry} */
        const entry = {
            timestamp: new Date().toISOString(),
            level: LEVEL_NAMES[level],
            message,
            bot: this.botName
        };

        if (this.traceId) {
            entry.traceId = this.traceId;
        }

        if (context) {
            entry.context = context;
        }

        if (data) {
            entry.data = data;
        }

        if (data?.error instanceof Error) {
            entry.error = data.error.message;
            if (data.error.stack) {
                entry.stack = data.error.stack;
            }
        }

        return entry;
    }

    /**
     * Formatea un entry para consola
     * @private
     * @param {LogEntry} entry
     * @returns {string}
     */
    _formatConsole(entry) {
        const prefix = `[${entry.timestamp}] [${entry.level}] [${entry.bot}]`;
        let formatted = `${prefix} ${entry.message}`;

        if (entry.context) {
            formatted += ` (${entry.context})`;
        }

        if (entry.error) {
            formatted += `\n  Error: ${entry.error}`;
        }

        return formatted;
    }

    /**
     * Formatea un entry para archivo (JSON)
     * @private
     * @param {LogEntry} entry
     * @returns {string}
     */
    _formatFile(entry) {
        return JSON.stringify(entry) + '\n';
    }

    /**
     * Verifica si el nivel dado debería ser loggeado
     * @private
     * @param {number} level
     * @returns {boolean}
     */
    _shouldLog(level) {
        return level >= this.minLevel && !this._destroyed;
    }

    /**
     * Asegura que el directorio de logs existe
     * @private
     * @returns {void}
     */
    _ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Obtiene la ruta del archivo de log para la fecha actual
     * @private
     * @returns {string}
     */
    _getLogFilePath() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `${date}.log`);
    }

    /**
     * Obtiene la ruta del archivo de errores
     * @private
     * @returns {string}
     */
    _getErrorFilePath() {
        const date = new Date().toISOString().split('T')[0];
        return path.join(this.logDir, `errors_${date}.log`);
    }

    /**
     * Escribe un entry al buffer o directamente al archivo
     * @private
     * @param {LogEntry} entry
     * @param {boolean} isError
     * @returns {void}
     */
    _write(entry, isError = false) {
        if (this.consoleEnabled) {
            const formatted = this._formatConsole(entry);
            if (isError || entry.level === 'ERROR' || entry.level === 'FATAL') {
                console.error(formatted);
            } else if (entry.level === 'WARN') {
                console.warn(formatted);
            } else {
                console.log(formatted);
            }
        }

        if (this.fileEnabled) {
            const filePath = isError ? this._getErrorFilePath() : this._getLogFilePath();
            const content = this._formatFile(entry);

            // Buffering para mejor performance
            this._buffer.push({ path: filePath, content });
            this._bufferSize += content.length;

            // Flush si el buffer está muy lleno
            if (this._bufferSize >= 65536) { // 64KB
                this._flush();
            }
        }
    }

    /**
     * Hace flush del buffer al disco
     * @private
     * @returns {void}
     */
    _flush() {
        if (this._buffer.length === 0) return;

        const entries = this._buffer.splice(0);
        this._bufferSize = 0;

        for (const { path: filePath, content } of entries) {
            try {
                fs.appendFileSync(filePath, content, 'utf8');
            } catch (err) {
                console.error(`[Logger] Error writing to ${filePath}:`, err.message);
            }
        }
    }

    /**
     * Inicia el interval de flush periódico
     * @private
     * @returns {void}
     */
    _startFlushInterval() {
        this._flushInterval = setInterval(() => {
            this._flush();
        }, 5000); // Flush cada 5 segundos
    }

    /**
     * Loggea un mensaje
     * @param {number} level - Nivel de log
     * @param {string} message - Mensaje
     * @param {string} [context] - Contexto
     * @param {Object} [data] - Datos adicionales
     * @returns {void}
     */
    _log(level, message, context, data) {
        if (!this._shouldLog(level)) return;

        const entry = this._createEntry(level, message, context, data);
        const isError = level >= LOG_LEVELS.ERROR;

        this._write(entry, isError);
    }

    /**
     * Log de trace
     * @param {string} message
     * @param {string} [context]
     * @param {Object} [data]
     * @returns {void}
     */
    trace(message, context, data) {
        this._log(LOG_LEVELS.TRACE, message, context, data);
    }

    /**
     * Log de debug
     * @param {string} message
     * @param {string} [context]
     * @param {Object} [data]
     * @returns {void}
     */
    debug(message, context, data) {
        this._log(LOG_LEVELS.DEBUG, message, context, data);
    }

    /**
     * Log de información
     * @param {string} message
     * @param {string} [context]
     * @param {Object} [data]
     * @returns {void}
     */
    info(message, context, data) {
        this._log(LOG_LEVELS.INFO, message, context, data);
    }

    /**
     * Log de advertencia
     * @param {string} message
     * @param {string} [context]
     * @param {Object} [data]
     * @returns {void}
     */
    warn(message, context, data) {
        this._log(LOG_LEVELS.WARN, message, context, data);
    }

    /**
     * Log de error
     * @param {string} message
     * @param {string|Error} error
     * @param {string} [context]
     * @returns {void}
     */
    error(message, error, context) {
        const data = error instanceof Error ? { error } : undefined;
        this._log(LOG_LEVELS.ERROR, message, context, data);
    }

    /**
     * Log de error fatal
     * @param {string} message
     * @param {Error} error
     * @param {string} [context]
     * @returns {void}
     */
    fatal(message, error, context) {
        const data = error instanceof Error ? { error } : undefined;
        this._log(LOG_LEVELS.FATAL, message, context, data);
    }

    /**
     * Crea un child logger con contexto adicional
     * @param {string} context - Contexto para el child logger
     * @returns {Logger}
     */
    child(context) {
        const child = new Logger({
            botName: this.botName,
            logDir: this.logDir,
            minLevel: LOG_LEVELS[this.minLevel],
            console: this.consoleEnabled,
            file: this.fileEnabled
        });
        child.traceId = this.traceId;
        child._log = (level, msg, ctx, data) => {
            this._log(level, msg, ctx || context, data);
        };
        return child;
    }

    /**
     * Destruye el logger, hace flush final y limpia recursos
     * @returns {Promise<void>}
     */
    async destroy() {
        this._destroyed = true;
        this._flush();

        if (this._flushInterval) {
            clearInterval(this._flushInterval);
            this._flushInterval = null;
        }
    }
}

/**
 * Crea una instancia de Logger para un bot específico
 * @param {string} botName
 * @param {string} [logDir]
 * @returns {Logger}
 */
function createLogger(botName, logDir) {
    return new Logger({
        botName,
        logDir: logDir || `./logs_${botName.toLowerCase().replace(/\s+/g, '_')}`,
        minLevel: 'INFO',
        console: true,
        file: true
    });
}

module.exports = { Logger, createLogger, LOG_LEVELS };

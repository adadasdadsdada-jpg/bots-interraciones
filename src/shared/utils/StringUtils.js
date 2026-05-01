/**
 * @fileoverview StringUtils - Utilidades para manipulación de strings
 * @module shared/utils/StringUtils
 * @author Staff Bot System
 * @version 2.0.0
 */

'use strict';

/**
 * Trunca un string a un máximo de caracteres
 * @param {string} str - String a truncar
 * @param {number} maxLen - Longitud máxima
 * @param {string} [suffix='...'] - Sufijo para strings truncados
 * @returns {string}
 */
function truncate(str, maxLen, suffix = '...') {
    if (!str) return 'Sin contenido';
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - suffix.length) + suffix;
}

/**
 * Formatea una fecha a formato Discord timestamp
 * @param {Date|string} date - Fecha a formatear
 * @param {'t'|'T'|'d'|'D'|'f'|'F'|'R'} [format='f'] - Formato Discord
 * @returns {string} Timestamp de Discord
 */
function formatDate(date, format = 'f') {
    const timestamp = Math.floor(new Date(date).getTime() / 1000);
    return `<t:${timestamp}:${format}>`;
}

/**
 * Formatea una fecha a formato legible en español
 * @param {Date} date - Fecha a formatear
 * @returns {string}
 */
function formatDateLocal(date) {
    return new Date(date).toLocaleString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Extrae una mención de Discord de un string
 * @param {string} text - Texto que puede contener una mención
 * @returns {string|null} ID del usuario o null
 */
function extractMention(text) {
    if (!text) return null;
    const match = text.match(/<@!?(\d+)>/);
    return match ? match[1] : null;
}

/**
 * Extrae una mención de rol de un string
 * @param {string} text - Texto que puede contener una mención de rol
 * @returns {string|null} ID del rol o null
 */
function extractRoleMention(text) {
    if (!text) return null;
    const match = text.match(/<@&(\d+)>/);
    return match ? match[1] : null;
}

/**
 * Extrae una mención de canal de un string
 * @param {string} text - Texto que puede contener una mención de canal
 * @returns {string|null} ID del canal o null
 */
function extractChannelMention(text) {
    if (!text) return null;
    const match = text.match(/<#(\d+)>/);
    return match ? match[1] : null;
}

/**
 * Escapa caracteres especiales de Discord para Markdown
 * @param {string} text - Texto a escapar
 * @returns {string}
 */
function escapeMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\')
        .replace(/\|/g, '\\|')
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/~/g, '\\~')
        .replace(/`/g, '\\`');
}

/**
 * Genera un ключ de auditoría único
 * @param {string} eventType - Tipo de evento
 * @param {string} targetId - ID del objetivo
 * @returns {string}
 */
function generateAuditKey(eventType, targetId) {
    return `${eventType}-${targetId}`;
}

/**
 * Normaliza un nombre de usuario para búsqueda
 * @param {string} name - Nombre a normalizar
 * @returns {string}
 */
function normalizeForSearch(name) {
    if (!name) return '';
    return name.toLowerCase().trim();
}

/**
 * Verifica si un string es un ID válido de Discord
 * @param {string} str - String a verificar
 * @returns {boolean}
 */
function isValidDiscordId(str) {
    if (!str) return false;
    return /^\d{17,19}$/.test(str);
}

/**
 * Genera un footer para embeds de solicitud
 * @param {string} userId - ID del usuario
 * @param {string} [suffix] - Sufijo adicional
 * @returns {string}
 */
function generateSolicitudeFooter(userId, suffix) {
    const base = `solicitud_${userId}`;
    return suffix ? `${base}_${suffix}` : `${base}_${Date.now()}`;
}

/**
 * Capitaliza la primera letra de un string
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convierte un string a camelCase
 * @param {string} str
 * @returns {string}
 */
function toCamelCase(str) {
    if (!str) return '';
    return str
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
            index === 0 ? word.toLowerCase() : word.toUpperCase()
        )
        .replace(/\s+/g, '');
}

/**
 * Convierte un string a kebab-case
 * @param {string} str
 * @returns {string}
 */
function toKebabCase(str) {
    if (!str) return '';
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/\s+/g, '-')
        .toLowerCase();
}

/**
 * Reemplaza variables en una plantilla
 * @param {string} template - Plantilla con placeholders {{variable}}
 * @param {Object} data - Datos para reemplazar
 * @returns {string}
 */
function template(template, data) {
    if (!template) return '';
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
    });
}

module.exports = {
    truncate,
    formatDate,
    formatDateLocal,
    extractMention,
    extractRoleMention,
    extractChannelMention,
    escapeMarkdown,
    generateAuditKey,
    normalizeForSearch,
    isValidDiscordId,
    generateSolicitudeFooter,
    capitalize,
    toCamelCase,
    toKebabCase,
    template
};

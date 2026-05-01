/**
 * @fileoverview EmbedFactory - Factory para crear embeds de Discord de forma consistente
 * @module shared/utils/EmbedFactory
 * @author Staff Bot System
 * @version 2.0.0
 */

'use strict';

const { EmbedBuilder } = require('discord.js');

/**
 * @typedef {Object} EmbedAuthor
 * @property {string} name - Nombre del autor
 * @property {string} [iconURL] - URL del avatar
 */

/**
 * @typedef {Object} EmbedField
 * @property {string} name - Nombre del campo
 * @property {string} value - Valor del campo
 * @property {boolean} [inline] - Si el campo es inline
 */

/**
 * Factory para crear embeds de Discord de forma DRY y consistente
 */
class EmbedFactory {
    /**
     * Crea un embed base con configuración común
     * @static
     * @param {EmbedAuthor} author - Datos del autor
     * @param {string} title - Título del embed
     * @param {number} color - Color del embed (hex number)
     * @param {EmbedField[]} [fields=[]] - Campos opcionales
     * @returns {EmbedBuilder}
     */
    static base(author, title, color, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: author.name,
                iconURL: author.iconURL
            })
            .setTitle(title)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }

        return embed;
    }

    /**
     * Crea un embed simple sin autor
     * @static
     * @param {string} title - Título
     * @param {string} description - Descripción
     * @param {number} color - Color
     * @returns {EmbedBuilder}
     */
    static simple(title, description, color) {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();
    }

    /**
     * Crea un embed con thumbnail
     * @static
     * @param {EmbedAuthor} author - Datos del autor
     * @param {string} title - Título
     * @param {number} color - Color
     * @param {string} thumbnailURL - URL del thumbnail
     * @param {EmbedField[]} [fields=[]] - Campos
     * @returns {EmbedBuilder}
     */
    static withThumbnail(author, title, color, thumbnailURL, fields = []) {
        return this.base(author, title, color, fields)
            .setThumbnail(thumbnailURL);
    }

    /**
     * Crea un embed de log con footer estándar
     * @static
     * @param {EmbedAuthor} author - Datos del autor
     * @param {string} title - Título
     * @param {number} color - Color
     * @param {EmbedField[]} [fields=[]] - Campos
     * @param {string} [footerText] - Texto del footer
     * @returns {EmbedBuilder}
     */
    static logEntry(author, title, color, fields = [], footerText = 'Staff Fiestas - Log') {
        return this.base(author, title, color, fields)
            .setFooter({ text: footerText });
    }

    /**
     * Crea un embed de solicitud de verificación
     * @static
     * @param {Object} user - Usuario de Discord
     * @param {string} nombreIC - Nombre IC
     * @param {string} idIC - ID del personaje
     * @param {string} rangoNombre - Nombre del rango solicitado
     * @param {number} verificationColor - Color para verificación
     * @returns {EmbedBuilder}
     */
    static verificationRequest(user, nombreIC, idIC, rangoNombre, verificationColor) {
        return new EmbedBuilder()
            .setTitle('📋 Nueva Solicitud')
            .setDescription(`**Solicitante:** ${user}`)
            .setColor(verificationColor)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { name: 'Nombre IC', value: nombreIC, inline: true },
                { name: 'ID', value: idIC, inline: true },
                { name: 'Rango', value: rangoNombre, inline: true }
            )
            .setFooter({ text: `ID: ${user.id}` })
            .setTimestamp();
    }

    /**
     * Crea un embed de aprobación de verificación
     * @static
     * @param {Object} author - Autor de la aprobación
     * @param {Object} user - Usuario aprobado
     * @param {string} nombreIC - Nombre IC
     * @param {string} idIC - ID del personaje
     * @param {string} rangoSolicitado - Rango aprobado
     * @param {number} successColor - Color de éxito
     * @returns {EmbedBuilder}
     */
    static verificationApproved(author, user, nombreIC, idIC, rangoSolicitado, successColor) {
        return new EmbedBuilder()
            .setTitle('✅ VERIFICACIÓN APROBADA')
            .setDescription('✨ **¡Felicidades! La verificación ha sido aprobada.**')
            .setColor(successColor)
            .setThumbnail(author.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                {
                    name: 'Solicitante',
                    value: `**${rangoSolicitado}** | 🎉${nombreIC} | ${idIC}\nDiscord: <@${user.id}> (${user.id})`,
                    inline: false
                },
                { name: '📝 Nombre IC', value: nombreIC, inline: true },
                { name: '🎮 ID', value: idIC, inline: true },
                { name: '⭐ Rango Solicitado', value: rangoSolicitado, inline: true },
                { name: '👮 Autorizado por', value: `<@${author.id}> (${author.id})`, inline: true },
                {
                    name: '🕐 Hora',
                    value: new Date().toLocaleString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    inline: false
                }
            )
            .setFooter({ text: 'Staff FIESTAS - Sistema de Verificación' })
            .setTimestamp();
    }

    /**
     * Crea un embed de rechazo de verificación
     * @static
     * @param {Object} author - Autor del rechazo
     * @param {Object} user - Usuario rechazado
     * @param {string} nombreIC - Nombre IC
     * @param {string} idIC - ID del personaje
     * @param {string} rangoSolicitado - Rango rechazado
     * @param {number} errorColor - Color de error
     * @returns {EmbedBuilder}
     */
    static verificationRejected(author, user, nombreIC, idIC, rangoSolicitado, errorColor) {
        return new EmbedBuilder()
            .setTitle('❌ VERIFICACIÓN RECHAZADA')
            .setDescription('❌ **La verificación ha sido rechazada.**')
            .setColor(errorColor)
            .setThumbnail(author.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                {
                    name: 'Solicitante',
                    value: `${nombreIC} | ${idIC}\nDiscord: <@${user.id}> (${user.id})`,
                    inline: false
                },
                { name: '📝 Nombre IC', value: nombreIC, inline: true },
                { name: '🎮 ID', value: idIC, inline: true },
                { name: '⭐ Rango Solicitado', value: rangoSolicitado, inline: true },
                { name: '👮 Autorizado por', value: `<@${author.id}> (${author.id})`, inline: true },
                {
                    name: '🕐 Hora',
                    value: new Date().toLocaleString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    inline: false
                }
            )
            .setFooter({ text: 'Staff FIESTAS - Sistema de Verificación' })
            .setTimestamp();
    }

    /**
     * Crea un embed de mensaje enviado (log)
     * @static
     * @param {Object} message - Mensaje de Discord
     * @param {number} color - Color del embed
     * @param {Function} truncateFn - Función para truncar texto
     * @returns {EmbedBuilder}
     */
    static messageCreate(message, color, truncateFn = (str) => str) {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: message.author.tag,
                iconURL: message.author.displayAvatarURL({ dynamic: true, size: 64 })
            })
            .setTitle('💬 Mensaje Enviado')
            .addFields(
                { name: 'Canal', value: `<#${message.channel.id}> (${message.channel.name})`, inline: true },
                { name: 'Autor', value: `${message.author}`, inline: true },
                { name: 'Contenido', value: truncateFn(message.content || '*Sin texto*', 1800), inline: false }
            )
            .setTimestamp(message.createdAt);

        if (message.attachments.size > 0) {
            embed.addFields({
                name: 'Adjuntos',
                value: message.attachments.map(a => `[${a.name}](${a.url})`).join('\n'),
                inline: false
            });
        }

        return embed;
    }

    /**
     * Crea un embed de mensaje editado (log)
     * @static
     * @param {Object} oldMessage - Mensaje antes de editar
     * @param {Object} newMessage - Mensaje después de editar
     * @param {number} color - Color del embed
     * @param {Function} truncateFn - Función para truncar
     * @returns {EmbedBuilder}
     */
    static messageUpdate(oldMessage, newMessage, color, truncateFn = (str) => str) {
        const oldContent = oldMessage.content || '*No disponible*';
        const newContent = newMessage.content;

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: newMessage.author?.tag || 'Desconocido',
                iconURL: newMessage.author?.displayAvatarURL({ dynamic: true, size: 64 })
            })
            .setTitle('✏️ Mensaje Editado')
            .addFields(
                { name: 'Canal', value: `<#${newMessage.channel.id}>`, inline: true },
                { name: 'Autor', value: `${newMessage.author}`, inline: true },
                { name: 'Antes', value: truncateFn(oldContent, 512), inline: false },
                { name: 'Después', value: truncateFn(newContent || '*Sin contenido*', 512), inline: false }
            )
            .setTimestamp(newMessage.editedAt || new Date());

        if (newMessage.url) {
            embed.setURL(newMessage.url);
        }

        return embed;
    }

    /**
     * Crea un embed de mensaje eliminado (log)
     * @static
     * @param {Object} message - Mensaje eliminado
     * @param {Object} author - Autor del mensaje
     * @param {number} color - Color del embed
     * @param {Function} truncateFn - Función para truncar
     * @returns {EmbedBuilder}
     */
    static messageDelete(message, author, color, truncateFn = (str) => str) {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: author?.tag || 'Autor desconocido',
                iconURL: message.author?.displayAvatarURL({ dynamic: true, size: 64 })
            })
            .setTitle('🗑️ Mensaje Eliminado')
            .addFields(
                { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Autor', value: author ? `<@${author.id}>` : 'Desconocido', inline: true },
                { name: 'Contenido', value: truncateFn(message.content || '*No disponible*'), inline: false }
            )
            .setTimestamp();

        if (message.attachments?.size > 0) {
            embed.addFields({
                name: 'Adjuntos eliminados',
                value: message.attachments.map(a => `[${a.name}](${a.url})`).join('\n'),
                inline: false
            });
        }

        return embed;
    }

    /**
     * Crea un embed de miembro nuevo (log)
     * @static
     * @param {Object} member - GuildMember
     * @param {number} color - Color del embed
     * @param {Function} formatDateFn - Función para formatear fecha
     * @returns {EmbedBuilder}
     */
    static memberJoin(member, color, formatDateFn = (d) => `<t:${Math.floor(new Date(d).getTime() / 1000)}:F>`) {
        return new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: member.user.tag,
                iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 })
            })
            .setTitle('🟢 Miembro Nuevo')
            .addFields(
                { name: 'Usuario', value: `${member.user}`, inline: true },
                { name: 'ID', value: member.user.id, inline: true },
                { name: 'Cuenta creada', value: formatDateFn(member.user.createdAt), inline: false },
                { name: 'Miembros totales', value: `${member.guild.memberCount}`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp();
    }

    /**
     * Crea un embed de rol añadido (log)
     * @static
     * @param {Object} member - GuildMember
     * @param {Object} role - Rol añadido
     * @param {Object} [executor] - Usuario que añadió el rol
     * @param {number} color - Color del embed
     * @returns {EmbedBuilder}
     */
    static roleAdd(member, role, executor, color) {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: member.user.tag,
                iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 })
            })
            .setTitle('➕ Rol Añadido')
            .addFields(
                { name: 'Usuario', value: `${member.user}`, inline: true },
                { name: 'Rol', value: `${role} (\`${role.name}\`)`, inline: true }
            )
            .setTimestamp();

        if (executor) {
            embed.addFields({ name: 'Cambiado por', value: `${executor} (${executor.tag})`, inline: true });
        }

        return embed;
    }

    /**
     * Crea un embed de rol quitado (log)
     * @static
     * @param {Object} member - GuildMember
     * @param {Object} role - Rol quitado
     * @param {Object} [executor] - Usuario que quitó el rol
     * @param {number} color - Color del embed
     * @returns {EmbedBuilder}
     */
    static roleRemove(member, role, executor, color) {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: member.user.tag,
                iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 })
            })
            .setTitle('➖ Rol Quitado')
            .addFields(
                { name: 'Usuario', value: `${member.user}`, inline: true },
                { name: 'Rol', value: `${role} (\`${role.name}\`)`, inline: true }
            )
            .setTimestamp();

        if (executor) {
            embed.addFields({ name: 'Cambiado por', value: `${executor} (${executor.tag})`, inline: true });
        }

        return embed;
    }

    /**
     * Crea un embed de comando slash ejecutado (log)
     * @static
     * @param {Object} interaction - Interacción de comando
     * @param {number} color - Color del embed
     * @returns {EmbedBuilder}
     */
    static slashCommand(interaction, color) {
        return new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 64 })
            })
            .setTitle('⌨️ Comando Slash Ejecutado')
            .addFields(
                { name: 'Comando', value: `/${interaction.commandName}`, inline: true },
                { name: 'Usuario', value: `${interaction.user}`, inline: true },
                { name: 'Canal', value: interaction.channel?.name || 'DM', inline: true }
            )
            .setTimestamp();
    }
}

module.exports = { EmbedFactory };

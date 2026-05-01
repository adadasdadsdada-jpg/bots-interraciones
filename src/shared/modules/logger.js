/**
 * Módulo de logging estructurado
 * Sistema de logs con embeds para Discord
 */

const { EmbedBuilder } = require('discord.js');

/**
 * @typedef {Object} LogConfig
 * @property {string} channelId - ID del canal de logs
 * @property {Object} colors - Colores por tipo de evento
 * @property {Function} client - Cliente de Discord
 */

/**
 * Logger estructurado para Discord bots
 */
class Logger {
  /**
   * @param {Object} options
   * @param {Object} options.client - Cliente de Discord
   * @param {string} options.channelId - ID del canal de logs
   * @param {Object} options.colors - Colores para embeds
   */
  constructor(options = {}) {
    this.client = options.client;
    this.channelId = options.channelId;
    this.colors = options.colors || {
      success: 0x00FF00,
      error: 0xFF0000,
      warning: 0xFFAA00,
      info: 0x3498DB,
      verify: 0x5865F2,
      memberJoin: 0x00CED1,
      memberLeave: 0x8B0000,
      messageCreate: 0x00FF00,
      messageUpdate: 0xFFA500,
      messageDelete: 0xFF0000,
      roleAdd: 0x32CD32,
      roleRemove: 0xFF6347,
      nickname: 0xDDA0DD,
    };
  }

  /**
   * Obtener canal de logs
   * @returns {Channel|undefined}
   */
  getLogChannel() {
    if (!this.client || !this.channelId) return null;
    return this.client.channels.cache.get(this.channelId);
  }

  /**
   * Enviar embed al canal de logs
   * @param {EmbedBuilder} embed
   * @returns {Promise<void>}
   */
  async logToChannel(embed) {
    const channel = this.getLogChannel();
    if (!channel || !channel.isTextBased() || channel.isDMBased()) return;

    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('[Logger] Error enviando log:', err.message);
    }
  }

  /**
   * Log genérico
   * @param {string} title
   * @param {string} description
   * @param {number} color
   * @param {Object} [fields]
   */
  log(title, description, color = this.colors.info, fields = []) {
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (fields.length > 0) {
      embed.addFields(fields);
    }

    this.logToChannel(embed);
    console.log(`[${title}] ${description}`);
  }

  /**
   * Log de éxito
   * @param {string} title
   * @param {string} description
   */
  success(title, description) {
    this.log(title, description, this.colors.success);
  }

  /**
   * Log de error
   * @param {string} title
   * @param {string} description
   */
  error(title, description) {
    this.log(title, description, this.colors.error);
  }

  /**
   * Log de advertencia
   * @param {string} title
   * @param {string} description
   */
  warn(title, description) {
    this.log(title, description, this.colors.warning);
  }

  /**
   * Log de información
   * @param {string} title
   * @param {string} description
   */
  info(title, description) {
    this.log(title, description, this.colors.info);
  }

  // ============================================
  // LOGS ESPECÍFICOS PARA EVENTOS DE DISCORD
  // ============================================

  /**
   * Log de mensaje creado
   * @param {Object} message
   */
  messageCreate(message) {
    const embed = new EmbedBuilder()
      .setColor(this.colors.messageCreate)
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL({ dynamic: true, size: 64 }),
      })
      .setTitle('💬 Mensaje Enviado')
      .addFields(
        { name: 'Canal', value: `#${message.channel.name}`, inline: true },
        { name: 'Autor', value: message.author.toString(), inline: true },
        { name: 'Contenido', value: this.truncate(message.content, 1024) || '*Sin texto*' }
      )
      .setTimestamp();

    this.logToChannel(embed);
  }

  /**
   * Log de mensaje eliminado
   * @param {Object} message
   * @param {Object} [author]
   */
  messageDelete(message, author) {
    const embed = new EmbedBuilder()
      .setColor(this.colors.messageDelete)
      .setAuthor({
        name: author?.tag || 'Autor desconocido',
        iconURL: message.author?.displayAvatarURL({ dynamic: true, size: 64 }),
      })
      .setTitle('🗑️ Mensaje Eliminado')
      .addFields(
        { name: 'Canal', value: `#${message.channel.name}`, inline: true },
        { name: 'Autor', value: author ? `<@${author.id}>` : 'Desconocido', inline: true },
        { name: 'Contenido', value: this.truncate(message.content, 1024) || '*No disponible*' }
      )
      .setTimestamp();

    this.logToChannel(embed);
  }

  /**
   * Log de mensaje editado
   * @param {Object} oldMessage
   * @param {Object} newMessage
   */
  messageUpdate(oldMessage, newMessage) {
    if (oldMessage.content === newMessage.content) return;

    const embed = new EmbedBuilder()
      .setColor(this.colors.messageUpdate)
      .setAuthor({
        name: newMessage.author?.tag || 'Desconocido',
        iconURL: newMessage.author?.displayAvatarURL({ dynamic: true, size: 64 }),
      })
      .setTitle('✏️ Mensaje Editado')
      .addFields(
        { name: 'Canal', value: `#${newMessage.channel.name}`, inline: true },
        { name: 'Autor', value: newMessage.author?.toString() || 'Desconocido', inline: true },
        { name: 'Antes', value: this.truncate(oldMessage.content, 512) || '*Sin texto*' },
        { name: 'Después', value: this.truncate(newMessage.content, 512) || '*Sin texto*' }
      )
      .setTimestamp();

    if (newMessage.url) embed.setURL(newMessage.url);

    this.logToChannel(embed);
  }

  /**
   * Log de miembro nuevo
   * @param {Object} member
   */
  memberJoin(member) {
    const embed = new EmbedBuilder()
      .setColor(this.colors.memberJoin)
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 }),
      })
      .setTitle('👋 Nuevo Miembro')
      .addFields(
        { name: 'Usuario', value: member.user.toString(), inline: true },
        { name: 'ID', value: member.user.id, inline: true },
        { name: 'Total', value: String(member.guild.memberCount), inline: true }
      )
      .setTimestamp();

    this.logToChannel(embed);
  }

  /**
   * Log de miembro que salió
   * @param {Object} member
   */
  memberLeave(member) {
    const embed = new EmbedBuilder()
      .setColor(this.colors.memberLeave)
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 }),
      })
      .setTitle('👋 Miembro Salió')
      .addFields(
        { name: 'Usuario', value: member.user.toString(), inline: true },
        { name: 'ID', value: member.user.id, inline: true }
      )
      .setTimestamp();

    this.logToChannel(embed);
  }

  /**
   * Log de cambio de rol
   * @param {Object} member
   * @param {Object} role
   * @param {boolean} added - true si se añadió, false si se quitó
   */
  roleChange(member, role, added) {
    const embed = new EmbedBuilder()
      .setColor(added ? this.colors.roleAdd : this.colors.roleRemove)
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 }),
      })
      .setTitle(added ? '🎭 Rol Añadido' : '🎭 Rol Removido')
      .addFields(
        { name: 'Usuario', value: member.user.toString(), inline: true },
        { name: 'Rol', value: role.name, inline: true }
      )
      .setTimestamp();

    this.logToChannel(embed);
  }

  /**
   * Log de cambio de apodo
   * @param {Object} member
   * @param {string} oldNickname
   * @param {string} newNickname
   */
  nicknameChange(member, oldNickname, newNickname) {
    const embed = new EmbedBuilder()
      .setColor(this.colors.nickname)
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 }),
      })
      .setTitle('📝 Cambio de Apodo')
      .addFields(
        { name: 'Usuario', value: member.user.toString(), inline: true },
        { name: 'Antes', value: oldNickname || '*Sin apodo*', inline: true },
        { name: 'Después', value: newNickname || '*Sin apodo*', inline: true }
      )
      .setTimestamp();

    this.logToChannel(embed);
  }

/**
 * Log de moderación
 * @param {EmbedBuilder} embed
 */
modAction(embed) {
  this.logToChannel(embed);
}

/**
 * Función stand-alone para log de moderación (compatibilidad)
 * @param {EmbedBuilder} embed
 * @param {Object} config - ConfigManager
 */
function logModAction(embed, config) {
  const channelId = config.channels.logsActividad || config.channels.logChannelId;
  const channel = config.client.channels.cache.get(channelId);
  if (channel && channel.isTextBased() && !channel.isDMBased()) {
    channel.send({ embeds: [embed] }).catch(() => {});
  }
}

module.exports = { Logger, createLogger, logModAction };
/**
 * Comandos de Moderación
 * Sistema de comandos con prefijo ! para moderadores
 */

const {
  EmbedBuilder,
  PermissionsBitField,
} = require('discord.js');

const { logModAction } = require('../shared/modules/database');
const { ROLES, MOD_ACTIONS } = require('../shared/types');

/**
 * Crear handlers de moderación
 * @param {Object} config - ConfigManager del bot
 */
function createModerationHandlers(config) {
  const client = config.client;
  const COMMAND_PREFIX = '!';

  /**
   * Configurar comandos de moderación
   */
  function setupModCommands() {
    client.on('messageCreate', async (message) => {
      if (!message.content.startsWith(COMMAND_PREFIX) || message.author.bot) return;
      if (message.guild?.id !== config.bot.serverId) return;

      const args = message.content.slice(1).trim().split(/\s+/);
      const command = args.shift()?.toLowerCase();

      // ============================================
      // COMANDOS DE MODERACIÓN
      // ============================================

      if (command === 'ping') {
        await message.reply('🏓 Pong!');
        return;
      }

      if (command === 'kick' && hasModPermission(message.member)) {
        const userId = extractUserId(args[0]);
        const reason = args.slice(1).join(' ') || 'Sin razón';

        if (!userId) {
          await message.reply('❌ Uso: `!kick <usuario> [razón]`');
          return;
        }

        const member = await message.guild?.members.fetch(userId).catch(() => null);
        if (!member) {
          await message.reply('❌ Usuario no encontrado.');
          return;
        }

        await member.kick(reason);
        logModAction(MOD_ACTIONS.KICK, userId, member.user.tag, message.author.id, message.author.tag, reason);

        const embed = new EmbedBuilder()
          .setTitle('⚡ Usuario Expulsado')
          .setColor(config.colors.error)
          .addFields(
            { name: 'Usuario', value: member.user.tag, inline: true },
            { name: 'Moderador', value: message.author.tag, inline: true },
            { name: 'Razón', value: reason }
          )
          .setTimestamp();

        logModActionEmbed(embed, config);
        await message.reply(`✅ ${member.user.tag} ha sido expulsado.`);
        return;
      }

      if (command === 'ban' && hasModPermission(message.member)) {
        const userId = extractUserId(args[0]);
        const reason = args.slice(1).join(' ') || 'Sin razón';

        if (!userId) {
          await message.reply('❌ Uso: `!ban <usuario> [razón]`');
          return;
        }

        const member = await message.guild?.members.fetch(userId).catch(() => null);
        if (!member) {
          await message.reply('❌ Usuario no encontrado.');
          return;
        }

        await member.ban({ reason });
        logModAction(MOD_ACTIONS.BAN, userId, member.user.tag, message.author.id, message.author.tag, reason);

        const embed = new EmbedBuilder()
          .setTitle('🔨 Usuario Baneado')
          .setColor(config.colors.error)
          .addFields(
            { name: 'Usuario', value: member.user.tag, inline: true },
            { name: 'Moderador', value: message.author.tag, inline: true },
            { name: 'Razón', value: reason }
          )
          .setTimestamp();

        logModActionEmbed(embed, config);
        await message.reply(`✅ ${member.user.tag} ha sido baneado.`);
        return;
      }

      if (command === 'mute' && hasModPermission(message.member)) {
        const userId = extractUserId(args[0]);
        const duration = parseDuration(args[1]) || 3600000;
        const reason = args.slice(2).join(' ') || 'Sin razón';

        if (!userId) {
          await message.reply('❌ Uso: `!mute <usuario> [duración] [razón]`');
          return;
        }

        const member = await message.guild?.members.fetch(userId).catch(() => null);
        if (!member) {
          await message.reply('❌ Usuario no encontrado.');
          return;
        }

        const muteRole = message.guild?.roles.cache.find((r) => r.name === 'Muted');
        if (muteRole) {
          await member.roles.add(muteRole).catch(() => {});
        }

        // Auto-unmute después del tiempo
        setTimeout(() => {
          if (muteRole && member.roles) {
            member.roles.remove(muteRole).catch(() => {});
          }
        }, duration);

        logModAction(MOD_ACTIONS.MUTE, userId, member.user.tag, message.author.id, message.author.tag, `${reason} (${duration}ms)`);

        const embed = new EmbedBuilder()
          .setTitle('🔇 Usuario Silenciado')
          .setColor(config.colors.warning)
          .addFields(
            { name: 'Usuario', value: member.user.tag, inline: true },
            { name: 'Moderador', value: message.author.tag, inline: true },
            { name: 'Duración', value: formatDuration(duration), inline: true },
            { name: 'Razón', value: reason }
          )
          .setTimestamp();

        logModActionEmbed(embed, config);
        await message.reply(`🔇 ${member.user.tag} ha sido silenciado por ${formatDuration(duration)}.`);
        return;
      }

      if (command === 'warn' && hasModPermission(message.member)) {
        const userId = extractUserId(args[0]);
        const reason = args.slice(1).join(' ') || 'Sin razón';

        if (!userId) {
          await message.reply('❌ Uso: `!warn <usuario> [razón]`');
          return;
        }

        const member = await message.guild?.members.fetch(userId).catch(() => null);
        if (!member) {
          await message.reply('❌ Usuario no encontrado.');
          return;
        }

        logModAction(MOD_ACTIONS.WARN, userId, member.user.tag, message.author.id, message.author.tag, reason);

        const embed = new EmbedBuilder()
          .setTitle('⚠️ Advertencia')
          .setColor(config.colors.warning)
          .addFields(
            { name: 'Usuario', value: member.user.tag, inline: true },
            { name: 'Moderador', value: message.author.tag, inline: true },
            { name: 'Razón', value: reason }
          )
          .setTimestamp();

        logModActionEmbed(embed, config);
        await member.send(`⚠️ Has recibido una advertencia: ${reason}`).catch(() => {});
        await message.reply(`⚠️ ${member.user.tag} ha sido advertide.`);
        return;
      }

      if (command === 'purge' && hasModPermission(message.member)) {
        const count = Math.min(parseInt(args[0]) || 10, 100);

        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
          const messages = await message.channel.messages.fetch({ limit: count });
          await message.channel.bulkDelete(messages);

          await message.reply(`🧹 ${messages.size} mensajes eliminados.`).then((msg) => {
            setTimeout(() => msg.delete().catch(() => {}), 2000);
          });
        }
        return;
      }

      if (command === 'slowmode' && hasModPermission(message.member)) {
        const seconds = parseInt(args[0]) || 0;
        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
          message.channel.setRateLimitPerUser(seconds);
        }

        await message.reply(`🐌 Slowmode: ${seconds} segundos.`).catch(() => {});
        return;
      }
    });

    console.log('[MOD] Comandos de moderación configurados');
  }

  /**
   * Verificar si el miembro tiene permisos de moderación
   */
  function hasModPermission(member) {
    if (!member) return false;
    return member.roles.cache.some(
      r =>
        r.id === config.roles.adm ||
        r.id === config.roles.aux ||
        r.id === config.roles.lid
    );
  }

  /**
   * Extraer ID de usuario de una mención o texto
   */
  function extractUserId(input) {
    if (!input) return null;

    const mentionMatch = input.match(/<@!?(\d+)>/);
    if (mentionMatch) return mentionMatch[1];

    if (/^\d+$/.test(input)) return input;

    return null;
  }

  /**
   * Parsear duración (e.g., "1h", "30m", "60s")
   */
  function parseDuration(input) {
    if (!input) return null;

    const match = input.match(/^(\d+)([smhd])?$/);
    if (!match) return null;

    const value = parseInt(match[1]);
    const unit = match[2] || 's';

    const multipliers = {
      s: 1000,
      m: 60000,
      h: 3600000,
      d: 86400000,
    };

    return value * (multipliers[unit] || 1000);
  }

  /**
   * Formatear duración a texto legible
   */
  function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  /**
   * Enviar embed de moderación al canal de logs
   */
  async function logModActionEmbed(embed, config) {
    const channel = client.channels.cache.get(config.channels.logs);
    if (channel && channel.isTextBased() && !channel.isDMBased()) {
      await channel.send({ embeds: [embed] });
    }
  }

  return { setupModCommands };
}

module.exports = { createModerationHandlers };
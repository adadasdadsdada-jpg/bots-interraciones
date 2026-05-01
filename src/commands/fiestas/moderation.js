/**
 * Comandos de Moderación - FIESTAS
 * Sistema de moderación con comandos de prefijo
 */

const { EmbedBuilder } = require('discord.js');
const { logModAction } = require('../shared/modules/logger');
const { logModAction: dbLogModAction } = require('../shared/modules/database');

const COMMAND_PREFIX = '!';

function createModerationHandlers(config) {
  const client = config.client;

  function setupModCommands() {
    client.on('messageCreate', async (message) => {
      if (!message.content.startsWith(COMMAND_PREFIX) || message.author.bot) return;
      if (message.guild?.id !== config.bot.serverId) return;

      const args = message.content.slice(1).trim().split(/\s+/);
      const command = args.shift()?.toLowerCase();

      if (command === 'ping') {
        await message.reply('🏓 Pong!');
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
        dbLogModAction('KICK', userId, member.user.tag, message.author.id, message.author.tag, reason);

        const embed = new EmbedBuilder()
          .setTitle('⚡ Usuario Expulsado')
          .setColor(0xff0000)
          .addFields(
            { name: 'Usuario', value: member.user.tag, inline: true },
            { name: 'Moderador', value: message.author.tag, inline: true },
            { name: 'Razón', value: reason }
          )
          .setTimestamp();

        logModAction(embed, config);
        await message.reply(`✅ ${member.user.tag} ha sido expulsado.`);
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
        dbLogModAction('BAN', userId, member.user.tag, message.author.id, message.author.tag, reason);

        const embed = new EmbedBuilder()
          .setTitle('🔨 Usuario Baneado')
          .setColor(0xff0000)
          .addFields(
            { name: 'Usuario', value: member.user.tag, inline: true },
            { name: 'Moderador', value: message.author.tag, inline: true },
            { name: 'Razón', value: reason }
          )
          .setTimestamp();

        logModAction(embed, config);
        await message.reply(`✅ ${member.user.tag} ha sido baneado.`);
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

        setTimeout(() => {
          if (muteRole) {
            member.roles.remove(muteRole).catch(() => {});
          }
        }, duration);

        dbLogModAction('MUTE', userId, member.user.tag, message.author.id, message.author.tag, `${reason} (${duration}ms)`);

        const embed = new EmbedBuilder()
          .setTitle('🔇 Usuario Silenciado')
          .setColor(0xffaa00)
          .addFields(
            { name: 'Usuario', value: member.user.tag, inline: true },
            { name: 'Moderador', value: message.author.tag, inline: true },
            { name: 'Duración', value: formatDuration(duration), inline: true },
            { name: 'Razón', value: reason }
          )
          .setTimestamp();

        logModAction(embed, config);
        await message.reply(`🔇 ${member.user.tag} ha sido silenciado por ${formatDuration(duration)}.`);
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

        dbLogModAction('WARN', userId, member.user.tag, message.author.id, message.author.tag, reason);

        const embed = new EmbedBuilder()
          .setTitle('⚠️ Advertencia')
          .setColor(0xffaa00)
          .addFields(
            { name: 'Usuario', value: member.user.tag, inline: true },
            { name: 'Moderador', value: message.author.tag, inline: true },
            { name: 'Razón', value: reason }
          )
          .setTimestamp();

        logModAction(embed, config);
        await member.send(`⚠️ Has recibido una advertencia: ${reason}`).catch(() => {});
        await message.reply(`⚠️ ${member.user.tag} ha sido advertide.`);
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
      }

      if (command === 'slowmode' && hasModPermission(message.member)) {
        const seconds = parseInt(args[0]) || 0;
        if (message.channel.isTextBased() && !message.channel.isDMBased()) {
          message.channel.setRateLimitPerUser(seconds);
        }

        await message.reply(`🐌 Slowmode: ${seconds} segundos.`).catch(() => {});
      }
    });
  }

  function hasModPermission(member) {
    if (!member) return false;
    return member.roles.cache.some(
      (r) =>
        r.id === config.roles.adm ||
        r.id === config.roles.aux ||
        r.id === config.roles.lid
    );
  }

  function extractUserId(input) {
    if (!input) return null;

    const mentionMatch = input.match(/<@!?(\d+)>/);
    if (mentionMatch) return mentionMatch[1];

    if (/^\d+$/.test(input)) return input;

    return null;
  }

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

  return { setupModCommands };
}

module.exports = { createModerationHandlers };
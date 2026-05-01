/**
 * Handlers de Sets - FIESTAS
 * Gestión de solicitudes de sets con botones de aceptar/rechazar
 */

const { ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

function createSetHandlers(config) {
  const client = config.client;

  function setupSetHandlers() {
    const channelSetPendientes = client.channels.cache.get(config.channels.setsPendientes);

    if (channelSetPendientes && channelSetPendientes.isTextBased()) {
      const fetchMessages = async () => {
        try {
          const messages = await channelSetPendientes.messages.fetch({ limit: 100 });
          messages.forEach((message) => {
            if (!message.author.bot && !message.components.length) {
              addSetButtons(message);
            }
          });
        } catch (err) {
          console.log('[FIESTAS][SETS] Error fetching messages:', err);
        }
      };

      setTimeout(fetchMessages, 3000);
    }

    client.on('messageCreate', async (message) => {
      if (
        message.guild?.id === config.bot.serverId &&
        message.channel.id === config.channels.setsPendientes &&
        !message.author.bot
      ) {
        addSetButtons(message);
      }
    });

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;

      const customId = interaction.customId;

      if (customId.startsWith('fiestas_set_accept_')) {
        const messageId = customId.replace('fiestas_set_accept_', '');
        await handleSetAccept(interaction, messageId, config);
      } else if (customId.startsWith('fiestas_set_reject_')) {
        const messageId = customId.replace('fiestas_set_reject_', '');
        await handleSetReject(interaction, messageId, config);
      }
    });
  }

  async function addSetButtons(message) {
    if (message.components.length > 0) return;

    const acceptBtn = new ButtonBuilder()
      .setCustomId(`fiestas_set_accept_${message.id}`)
      .setLabel('Aceptar')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅');

    const rejectBtn = new ButtonBuilder()
      .setCustomId(`fiestas_set_reject_${message.id}`)
      .setLabel('Rechazar')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌');

    const row = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn);

    try {
      await message.edit({ components: [row] });
    } catch (err) {
      console.log('[FIESTAS][SETS] Error adding buttons:', err);
    }
  }

  async function handleSetAccept(interaction, messageId, config) {
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.reply({ content: '❌ Mensaje no encontrado.', ephemeral: true });
      return;
    }

    const guild = interaction.guild;
    const member = message.member || await guild.members.fetch(message.author.id).catch(() => null);

    if (member) {
      const miembroRole = guild.roles.cache.get(config.roles.miembro);
      if (miembroRole) {
        await member.roles.add(miembroRole).catch(() => {});
      }

      const content = message.content || '';
      const lines = content.split('\n');
      let nombreSet = message.author.username;
      let idSet = '00000';

      const idMatch = content.match(/ID:?\s*(\d+)/i) || content.match(/(\d{4,})/);
      if (idMatch) {
        idSet = idMatch[1];
      }

      const nombreMatch = content.match(/Nombre:?\s*([^\n]+)/i);
      if (nombreMatch) {
        nombreSet = nombreMatch[1].trim();
      } else if (lines.length > 0) {
        nombreSet = lines[0].substring(0, 30);
      }

      if (member.manageable) {
        const nickname = `.FT |🎉${nombreSet} | ${idSet}`;
        await member.setNickname(nickname).catch(() => {});
      }

      await member.send('✅ Tu set ha sido aprobado. Bienvenido!').catch(() => {});
    }

    const aceptadosChannel = guild.channels.cache.get(config.channels.aceptados);
    if (aceptadosChannel && aceptadosChannel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('✅ SET ACEPTADO')
        .setColor(0x00ff00)
        .addFields(
          { name: 'Usuario', value: message.author.tag, inline: true },
          { name: 'Contenido', value: message.content?.substring(0, 1024) || 'N/A' }
        )
        .setTimestamp();

      await aceptadosChannel.send({ embeds: [embed] });
    }

    await message.delete().catch(() => {});
    await interaction.reply({ content: '✅ Set aceptado y movido a #sets-aceptados', ephemeral: true });
  }

  async function handleSetReject(interaction, messageId, config) {
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.reply({ content: '❌ Mensaje no encontrado.', ephemeral: true });
      return;
    }

    const member = message.member || await interaction.guild.members.fetch(message.author.id).catch(() => null);
    if (member) {
      await member.send('❌ Tu set ha sido rechazado. Contacta a un ADM para más información.').catch(() => {});
    }

    const rechazadosChannel = interaction.guild.channels.cache.get(config.channels.rechazados);
    if (rechazadosChannel && rechazadosChannel.isTextBased()) {
      const embed = new EmbedBuilder()
        .setTitle('❌ SET RECHAZADO')
        .setColor(0xff0000)
        .addFields(
          { name: 'Usuario', value: message.author.tag, inline: true },
          { name: 'Contenido', value: message.content?.substring(0, 1024) || 'N/A' }
        )
        .setTimestamp();

      await rechazadosChannel.send({ embeds: [embed] });
    }

    await message.delete().catch(() => {});
    await interaction.reply({ content: '❌ Set rechazado y movido a #sets-rechazados', ephemeral: true });
  }

  return { setupSetHandlers };
}

module.exports = { createSetHandlers };
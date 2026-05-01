/**
 * Comando DM - FIESTAS
 * Enviar mensaje directo a todos los miembros (excepto Alta Cúpula y Resp.INT)
 */

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');

function createDmHandlers(config) {
  const client = config.client;

  async function setupDmCommand() {
    const guild = client.guilds.cache.get(config.bot.serverId);
    if (!guild) {
      console.log('[FIESTAS][DM] Servidor no encontrado');
      return;
    }

    const commands = await guild.commands.fetch();
    const existingDm = commands.find((c) => c.name === 'dm');
    if (existingDm) {
      await existingDm.delete();
      console.log('[FIESTAS][DM] Comando /dm eliminado para recrear');
    }

    await guild.commands.create({
      name: 'dm',
      description: 'Enviar mensaje directo a todos los miembros (excepto Alta Cúpula y Resp.INT)',
    });

    console.log('[FIESTAS][DM] Comando /dm creado');
  }

  function hasPermisoEnviarDM(member) {
    if (!member) return false;
    return member.roles.cache.some(
      (r) =>
        r.id === config.roles.adm ||
        r.id === config.roles.aux ||
        r.id === config.roles.respInt ||
        r.id === config.roles.altaCupula
    );
  }

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'dm') return;

    if (!hasPermisoEnviarDM(interaction.member)) {
      await interaction.reply({
        content: '❌ No tienes permisos para usar este comando.',
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('fiestas_dm_modal')
      .setTitle('📬 Enviar Mensaje a Miembros');

    const mensajeInput = new TextInputBuilder()
      .setCustomId('fiestas_dm_mensaje')
      .setLabel('Mensaje')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Escribe el mensaje que quieres enviar a todos los miembros...')
      .setRequired(true)
      .setMaxLength(2000);

    const row = new ActionRowBuilder().addComponents(mensajeInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'fiestas_dm_modal') return;

    const mensaje = interaction.fields.getTextInputValue('fiestas_dm_mensaje');

    if (!mensaje) {
      await interaction.reply({
        content: '❌ Debes escribir un mensaje.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: '📤 Enviando mensajes...',
      ephemeral: true,
    });

    const guild = interaction.guild;
    const excludedRoles = [config.roles.respInt, config.roles.altaCupula];

    let enviados = 0;
    let errores = 0;

    const members = await guild.members.fetch();

    for (const [, member] of members) {
      if (member.user.bot) continue;

      const hasExcludedRole = member.roles.cache.some((r) => excludedRoles.includes(r.id));
      if (hasExcludedRole) continue;

      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('📬 Mensaje del Staff')
          .setColor(0x3498db)
          .setDescription(mensaje)
          .setTimestamp()
          .setFooter({ text: 'Staff FIESTAS' });

        await member.send({ embeds: [dmEmbed] });
        enviados++;
      } catch {
        errores++;
      }
    }

    await interaction.editReply({
      content: `✅ Mensaje enviado a ${enviados} miembros.\n❌ Errores: ${errores}`,
    });
  });

  return { setupDmCommand };
}

module.exports = { createDmHandlers };
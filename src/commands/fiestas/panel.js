/**
 * Comando de Panel de Verificación - FIESTAS
 * Adaptado del bot-fiestas al sistema multi-bot
 */

const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
} = require('discord.js');

const { createVerificationRequest, updateVerificationStatus } = require('../shared/modules/database');
const { ROLES, NICKNAME_PREFIXES } = require('../shared/types');

const PANEL_DATA = {
  title: 'BIENVENIDO AL SISTEMA DE VERIFICACIÓN',
  description: 'Solicita tu acceso al staff',
  howItWorks: '📋 Cómo funciona?\n• Selecciona tu rango del menú\n• Completa el formulario\n• Espera autorización',
  dataRequired: '📝 Datos requeridos\n• Nombre IC\n• ID de personaje',
  note: '⚡ Nota\nAlta Cúpula solo puede ser aprobado por DEV o Alta Cúpula',
  footer: 'Staff Fiestas v2.0',
};

const roleSelectOptions = [
  { label: '🔥 Alta Cúpula', value: 'ALTA_CUPULA' },
  { label: '💀 Resp.INT', value: 'RESP_INT' },
  { label: '🎉 ADM', value: 'ADM' },
  { label: '🎉 AUX', value: 'AUX' },
  { label: '🎉 LID', value: 'LID' },
  { label: '🎉 SUB', value: 'SUB' },
  { label: '🎉 MIEMBRO', value: 'MIEMBRO' },
  { label: '🎉 TESTER', value: 'TESTER' },
];

const roleValueMap = {
  ALTA_CUPULA: ROLES.ALTA_CUPULA,
  RESP_INT: ROLES.RESP_INT,
  ADM: ROLES.ADM,
  AUX: ROLES.AUX,
  LID: ROLES.LID,
  SUB: ROLES.SUB,
  MIEMBRO: ROLES.MIEMBRO,
  TESTER: ROLES.TESTER,
};

function createPanelHandlers(config) {
  const client = config.client;

  async function setupPanelCommand() {
    const guild = client.guilds.cache.get(config.bot.serverId);
    if (!guild) {
      console.log('[FIESTAS][PANEL] Servidor no encontrado');
      return;
    }

    const commands = await guild.commands.fetch();
    const existingPanel = commands.find((c) => c.name === 'panel');
    if (existingPanel) {
      await existingPanel.delete();
      console.log('[FIESTAS][PANEL] Comando /panel eliminado para recrear');
    }

    await guild.commands.create({
      name: 'panel',
      description: 'Muestra el panel de verificación del staff',
    });

    console.log('[FIESTAS][PANEL] Comando /panel creado');
  }

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'panel') return;

    const embed = new EmbedBuilder()
      .setTitle(`**${PANEL_DATA.title}**`)
      .setDescription(`**${PANEL_DATA.description}**\n\n${PANEL_DATA.howItWorks}\n\n${PANEL_DATA.dataRequired}\n\n${PANEL_DATA.note}`)
      .setColor(0x5865f2)
      .setFooter({ text: `${PANEL_DATA.footer} • ${new Date().toLocaleDateString('es-ES')}` });

    const verifyButton = new ButtonBuilder()
      .setCustomId('fiestas_verify_open_modal')
      .setLabel('Verificarse')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🛡️');

    const row = new ActionRowBuilder().addComponents(verifyButton);

    await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    if (customId !== 'fiestas_verify_open_modal' && customId !== 'verify_open_modal') return;

    console.log(`[FIESTAS][PANEL] Botón de verificación presionado por ${interaction.user.tag}`);

    try {
      await interaction.deferReply({ ephemeral: true });
    } catch (err) {
      console.error(`[FIESTAS][PANEL] Error deferring reply:`, err.message);
      return;
    }

    const rangoSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('fiestas_verify_role_select')
      .setPlaceholder('Selecciona tu rango')
      .addOptions(roleSelectOptions);

    const rangoRow = new ActionRowBuilder().addComponents(rangoSelectMenu);

    try {
      await interaction.editReply({
        content: '**Selecciona tu rango:**',
        components: [rangoRow],
      });
    } catch (err) {
      console.error(`[FIESTAS][PANEL] Error showing select menu:`, err.message);
      await interaction.editReply({ content: '❌ Error al mostrar el menú. Intenta de nuevo.' }).catch(() => {});
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    const customId = interaction.customId;
    if (customId !== 'fiestas_verify_role_select' && customId !== 'verify_role_select') return;

    const selectedRole = interaction.values[0];

    console.log(`[FIESTAS][PANEL] Rol seleccionado: ${selectedRole} por ${interaction.user.tag}`);

    const modal = new ModalBuilder()
      .setCustomId('fiestas_verify_modal')
      .setTitle('Formulario de Verificación');

    const nombreICInput = new TextInputBuilder()
      .setCustomId('fiestas_verify_nombre_ic')
      .setLabel('Nombre IC')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ej: Jack Martinez')
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(50);

    const idPersonajeInput = new TextInputBuilder()
      .setCustomId('fiestas_verify_id_personaje')
      .setLabel('ID de Personaje')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ej: 69899')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(20);

    const rangoInput = new TextInputBuilder()
      .setCustomId('fiestas_verify_rango')
      .setLabel('Rango (ya seleccionado)')
      .setStyle(TextInputStyle.Short)
      .setValue(selectedRole)
      .setRequired(true)
      .setMaxLength(20);

    const firstRow = new ActionRowBuilder().addComponents(nombreICInput);
    const secondRow = new ActionRowBuilder().addComponents(idPersonajeInput);
    const thirdRow = new ActionRowBuilder().addComponents(rangoInput);

    modal.addComponents(firstRow, secondRow, thirdRow);

    try {
      await interaction.showModal(modal);
    } catch (err) {
      console.error(`[FIESTAS][PANEL] Error showing modal:`, err.message);
      await interaction.reply({ content: '❌ Error al mostrar el formulario. Intenta de nuevo.', ephemeral: true }).catch(() => {});
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'fiestas_verify_modal') return;

    console.log(`[FIESTAS][PANEL] Modal de verificación recibido de ${interaction.user.tag}`);

    try {
      await interaction.deferReply({ ephemeral: true });
    } catch (err) {
      console.error(`[FIESTAS][PANEL] Error deferring modal reply:`, err.message);
      return;
    }

    try {
      const nombreIC = interaction.fields.getTextInputValue('fiestas_verify_nombre_ic');
      const idPersonaje = interaction.fields.getTextInputValue('fiestas_verify_id_personaje');
      const rangoKey = interaction.fields.getTextInputValue('fiestas_verify_rango');

      console.log(`[FIESTAS][PANEL] Datos: nombreIC=${nombreIC}, idPersonaje=${idPersonaje}, rango=${rangoKey}`);

      const rangoSolicitado = roleValueMap[rangoKey] || ROLES.MIEMBRO;

      createVerificationRequest(
        interaction.user.id,
        interaction.user.tag,
        nombreIC,
        idPersonaje,
        rangoSolicitado
      );

      const moderatorChannel = client.channels.cache.get(config.channels.recepcion);

      if (moderatorChannel && moderatorChannel.isTextBased() && !moderatorChannel.isDMBased()) {
        const requestEmbed = new EmbedBuilder()
          .setTitle('📋 Nueva Solicitud de Verificación')
          .setColor(0x3498db)
          .addFields(
            { name: 'Usuario', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Nombre IC', value: nombreIC, inline: true },
            { name: 'ID Personaje', value: idPersonaje, inline: true },
            { name: 'Rango Solicitado', value: rangoSolicitado, inline: true }
          )
          .setTimestamp();

        const approveBtn = new ButtonBuilder()
          .setCustomId(`fiestas_verify_approve_${interaction.user.id}`)
          .setLabel('Aprobar')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅');

        const rejectBtn = new ButtonBuilder()
          .setCustomId(`fiestas_verify_reject_${interaction.user.id}`)
          .setLabel('Rechazar')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('❌');

        const row = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

        await moderatorChannel.send({ embeds: [requestEmbed], components: [row] });
      }

      await interaction.editReply({
        content: '✅ Tu solicitud ha sido enviada. Un administrador la revisará pronto.',
      });
    } catch (err) {
      console.error(`[FIESTAS][PANEL] Error processing modal:`, err.message);
      await interaction.editReply({ content: '❌ Error al procesar la solicitud. Intenta de nuevo.' }).catch(() => {});
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    if (customId.startsWith('fiestas_verify_approve_')) {
      const userId = customId.replace('fiestas_verify_approve_', '');
      await handleVerifyApprove(interaction, userId, config);
    } else if (customId.startsWith('fiestas_verify_reject_')) {
      const userId = customId.replace('fiestas_verify_reject_', '');
      await handleVerifyReject(interaction, userId, config);
    } else if (customId.startsWith('verify_approve_')) {
      const userId = customId.replace('verify_approve_', '');
      await handleVerifyApprove(interaction, userId, config);
    } else if (customId.startsWith('verify_reject_')) {
      const userId = customId.replace('verify_reject_', '');
      await handleVerifyReject(interaction, userId, config);
    }
  });

  return { setupPanelCommand };
}

async function handleVerifyApprove(interaction, targetUserId, config) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const member = await guild.members.fetch(targetUserId).catch(() => null);

  if (!member) {
    await interaction.editReply({ content: '❌ No se encontró el usuario.' });
    return;
  }

  const { getVerificationRequests } = require('../shared/modules/database');
  const verificationRequests = getVerificationRequests('PENDIENTE');
  const request = verificationRequests.find(
    (r) => r.userId === targetUserId && r.status === 'PENDIENTE'
  );

  if (!request) {
    await interaction.editReply({ content: '⚠️ No se encontró solicitud pendiente para este usuario.' });
    return;
  }

  const rangoRoleIdMap = {
    [ROLES.ALTA_CUPULA]: config.roles.altaCupula,
    [ROLES.RESP_INT]: config.roles.respInt,
    [ROLES.ADM]: config.roles.adm,
    [ROLES.AUX]: config.roles.aux,
    [ROLES.LID]: config.roles.lid,
    [ROLES.SUB]: config.roles.sub,
    [ROLES.MIEMBRO]: config.roles.miembro,
    [ROLES.TESTER]: config.roles.tester,
  };

  const previousRoles = [
    config.roles.altaCupula,
    config.roles.respInt,
    config.roles.adm,
    config.roles.aux,
    config.roles.lid,
    config.roles.sub,
    config.roles.miembro,
    config.roles.tester,
  ];

  for (const roleIdToRemove of previousRoles) {
    const oldRole = guild.roles.cache.get(roleIdToRemove);
    if (oldRole && member.roles.cache.has(oldRole.id)) {
      await member.roles.remove(oldRole).catch(() => {});
    }
  }

  const roleId = rangoRoleIdMap[request.rangoSolicitado];
  const role = roleId ? guild.roles.cache.get(roleId) : null;

  if (role) {
    await member.roles.add(role).catch(() => {});
  }

  const prefix = NICKNAME_PREFIXES[request.rangoSolicitado];
  if (prefix && member.manageable) {
    const userTag = member.user.tag || '';
    const tagParts = userTag.split('#');
    const userName = tagParts[0] || userTag;
    const userDiscrim = tagParts.length > 1 ? `#${tagParts[1]}` : '';

    let newNickname = '';
    if (request.rangoSolicitado === ROLES.ALTA_CUPULA) {
      newNickname = `🔥 ${userName} ${userDiscrim}`;
    } else if (request.rangoSolicitado === ROLES.RESP_INT) {
      newNickname = `Resp.INT|💀 ${userName} ${userDiscrim}`;
    } else {
      newNickname = `${prefix}${request.nombreIC} | ${request.idPersonaje}`;
    }
    await member.setNickname(newNickname).catch(() => {});
  }

  updateVerificationStatus(request.id, 'APROBADO', interaction.user.id);

  if (interaction.message && interaction.message.components) {
    const newComponents = interaction.message.components.map((actionRow) => {
      const disabledComponents = actionRow.components.map((comp) => {
        if (comp.type === 2) {
          return ButtonBuilder.from(comp).setDisabled(true);
        }
        return comp;
      });
      return ActionRowBuilder.from(actionRow).setComponents(disabledComponents);
    });
    await interaction.message.edit({ components: newComponents }).catch(() => {});
  }

  const aceptadosChannel = guild.channels.cache.get(config.channels.aceptados);
  if (aceptadosChannel && aceptadosChannel.isTextBased()) {
    const approvalEmbed = new EmbedBuilder()
      .setTitle('✅ VERIFICACIÓN APROBADA')
      .setColor(0x00ff00)
      .setDescription('✨ ¡Felicidades! La verificación ha sido aprobada.')
      .addFields(
        { name: 'Solicitante', value: `**${NICKNAME_PREFIXES[request.rangoSolicitado] || ''}${request.nombreIC}** | ${request.idPersonaje}`, inline: true }
      )
      .addFields(
        { name: 'Discord', value: `${member.user.tag} (${member.user.id})`, inline: true }
      )
      .addFields(
        { name: '📝 Nombre IC', value: request.nombreIC, inline: true },
        { name: '🎮 ID', value: request.idPersonaje, inline: true },
        { name: '⭐ Rango Solicitado', value: request.rangoSolicitado, inline: true },
        { name: '👮 Autorizado por', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Staff FIESTAS - Sistema de Verificación' });

    await aceptadosChannel.send({ embeds: [approvalEmbed] });
  }

  const approvalDM = new EmbedBuilder()
    .setTitle('🎆 SISTEMA DE VERIFICACIÓN — APROBADO')
    .setColor(0x00ff00)
    .setDescription(`✨ ¡Bienvenido a **FIESTAS**! ✨\n\n*Juntos hacemos que cada noche sea inolvidable.*`)
    .addFields(
      { name: '📝 Nombre IC', value: request.nombreIC, inline: true },
      { name: '🆔 ID de Personaje', value: request.idPersonaje, inline: true },
      { name: '⭐ Rango Asignado', value: request.rangoSolicitado, inline: true }
    )
    .addFields(
      { name: '📌 Nota', value: 'Tu apodo ha sido actualizado en el servidor. Si no lo ves, contacta a un administrador.', inline: false }
    )
    .setFooter({ text: `Staff FIESTAS - "Juntos hacemos que cada noche sea inolvidable" • ${new Date().toLocaleDateString('es-ES')}` });

  await member.send({ embeds: [approvalDM] }).catch(() => {});

  await interaction.editReply({ content: `✅ Solicitud de ${member.user.tag} aprobada.` });
}

async function handleVerifyReject(interaction, targetUserId, config) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const member = await guild.members.fetch(targetUserId).catch(() => null);

  const { getVerificationRequests, updateVerificationStatus } = require('../shared/modules/database');
  const verificationRequests = getVerificationRequests('PENDIENTE');
  const request = verificationRequests.find(
    (r) => r.userId === targetUserId && r.status === 'PENDIENTE'
  );

  if (!request) {
    await interaction.editReply({ content: '⚠️ No se encontró solicitud pendiente para este usuario.' });
    return;
  }

  updateVerificationStatus(request.id, 'RECHAZADO', interaction.user.id);

  if (interaction.message && interaction.message.components) {
    const newComponents = interaction.message.components.map((actionRow) => {
      const disabledComponents = actionRow.components.map((comp) => {
        if (comp.type === 2) {
          return ButtonBuilder.from(comp).setDisabled(true);
        }
        return comp;
      });
      return ActionRowBuilder.from(actionRow).setComponents(disabledComponents);
    });
    await interaction.message.edit({ components: newComponents }).catch(() => {});
  }

  if (member) {
    await member.send('❌ Tu solicitud ha sido rechazada. Contacta a un ADM para más información.').catch(() => {});
  }

  await interaction.editReply({ content: '❌ Solicitud rechazada.' });
}

module.exports = { createPanelHandlers };
/**
 * 📝 HANDLER DE MODALES
 * ============================================================
 * Respuestas a modal submissions.
 * Separado por responsabilidad única.
 */

const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');
const { AVAILABLE_ROLES } = require('../config/roles');

/**
 * Manejar modal de verificación
 * @param {Interaction} interaction
 * @param {Map} pendingVerifications - Mapa de verificaciones pendientes
 * @returns {boolean} Si fue procesado
 */
async function handleModalVerificar(interaction, pendingVerifications) {
    const nombreIC = interaction.fields.getTextInputValue('input_nombre');
    const idIC = interaction.fields.getTextInputValue('input_id');

    pendingVerifications.set(interaction.user.id, { nombreIC, idIC });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_rango')
        .setPlaceholder('Selecciona tu rango...');

    for (const [id, name] of Object.entries(AVAILABLE_ROLES)) {
        selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel(name).setValue(id));
    }

    await interaction.reply({
        content: `🎖️ **Datos registrados**\n📝 **Nombre IC:** \`${nombreIC}\`\n🎮 **ID:** \`${idIC}\`\n\n⭐ **Selecciona tu rango:**`,
        components: [new ActionRowBuilder().addComponents(selectMenu)],
        flags: 64
    });

    return true;
}

/**
 * Manejar modal de DM
 * @param {Interaction} interaction
 * @param {Map} config - Configuración del bot
 * @returns {Promise<{enviados: number, errores: number}>}
 */
async function handleModalDm(interaction) {
    const mensaje = interaction.fields.getTextInputValue('input_mensaje');
    await interaction.deferReply({ flags: 64 });

    const guild = interaction.guild;
    let enviados = 0, errores = 0;
    const { ROLES_DM } = require('../config/roles');
    const mensajeFormateado = `📨 **MENSAJE DEL STAFF**\n\n${mensaje}`;

    if (guild) {
        const allMembers = await guild.members.fetch();

        for (const [userId, member] of allMembers) {
            if (member.user.bot) continue;

            await member.fetch();
            const tieneRol = member.roles.cache.some(rol => ROLES_DM.includes(rol.id));
            if (!tieneRol) continue;

            try {
                await member.send(mensajeFormateado);
                enviados++;
            } catch (e) {
                errores++;
            }
        }
    }

    await interaction.editReply({ content: `✅ Enviados: ${enviados}\n❌ Errores: ${errores}` });
    return { enviados, errores };
}

/**
 * Manejar modal de registro manual
 * @param {Interaction} interaction
 * @param {Map} usuariosRegistrados - Mapa de usuarios
 * @returns {Promise<boolean>} Si fue exitoso
 */
async function handleModalRegistrar(interaction, usuariosRegistrados) {
    await interaction.deferReply({ flags: 64 });

    const usuarioTexto = interaction.fields.getTextInputValue('input_usuario');
    const nombreIC = interaction.fields.getTextInputValue('input_nombre');
    const idIC = interaction.fields.getTextInputValue('input_id');

    const guild = interaction.guild;
    if (!guild) {
        await interaction.editReply({ text: '❌ Error: no se pudo obtener el servidor.' });
        return false;
    }

    // Usar servicio de búsqueda
    const { buscarUsuario } = require('../services/usuario');
    const miembro = await buscarUsuario(guild, usuarioTexto);

    if (!miembro) {
        await interaction.editReply({ content: '❌ Usuario no encontrado o hay múltiples.' });
        return false;
    }

    usuariosRegistrados.set(miembro.user.id, { nombreIC, idIC });

    await interaction.editReply({ 
        content: `✅ **Registrado**\n👤 ${miembro.user.username}\n📝 ${nombreIC}\n🆔 ${idIC}` 
    });

    console.log(`💾 Usuario registrado: ${miembro.user.tag} → ${nombreIC} | ${idIC}`);
    return true;
}

module.exports = {
    handleModalVerificar,
    handleModalDm,
    handleModalRegistrar
};
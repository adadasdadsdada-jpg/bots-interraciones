const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, ModalBuilder, ButtonBuilder, ButtonStyle, TextInputStyle } = require('discord.js');
require('dotenv').config();

// ============================================================
// CONFIGURACIÓN (usa variables de entorno o valores por defecto)
// ============================================================
const TOKEN = process.env.DISCORD_TOKEN || '';
const CANAL_SOLICITUDES = process.env.BOT1_CANALES_SOLICITUDES || '1494810053000167645';
const CANAL_LOGS = process.env.BOT1_CANALES_LOGS || '1495090888689320157';
const DEV_USER_ID = process.env.BOT1_DEV_USER_ID || '1494806027898504528';
const DEV_ROLE_ID = process.env.BOT1_DEV_ROLE_ID || '1495086629684252836'; // Rol DEV
const ADM_ROLE_ID = process.env.BOT1_ADM_ROLE_ID || '1490174010758135959';

// Roles disponibles
const AVAILABLE_ROLES = {
    '1495090186885922979': 'Alta Cupula',
    '1490175650584330330': 'Responsable',
    '1490174010758135959': 'ADM',
    '1490173885948104894': 'Aux',
    '1490174081507659917': 'Lid',
    '1490174161069543596': 'Sub',
    '1490174280170737798': 'Miembro',
    '1490174348349276401': 'Tester'
};

// Roles que pueden aceptar solicitudes
const ROLES_AUTORIZADOS = {
    '1495086629684252836': 'DEV',
    '1490174010758135959': 'ADM',
    '1490173885948104894': 'Aux',
    '1490174081507659917': 'Lid',
    '1490175650584330330': 'Responsable',
    '1495090186885922979': 'Alta Cupula'
};

// Roles con permiso para DM
const ROLES_DM = ['1490174010758135959', '1490173885948104894', '1490174081507659917', '1490174161069543596', '1490174280170737798', '1490174348349276401', '1490384209804791899'];
// Rol excluido de mensajes (Alta Cupula no recibe DM)
const ROL_EXCLUIDO = '1495090186885922979';

// Permisos jerárquicos
const JERARQUIA_ROLES = [
    { id: '1495086629684252836', nombre: 'DEV', puedeAceptar: ['Alta Cupula', 'Responsable', 'ADM', 'Aux', 'Lid', 'Sub', 'Miembro', 'Tester'] },
    { id: '1495090186885922979', nombre: 'Alta Cupula', puedeAceptar: ['Alta Cupula', 'Responsable', 'ADM', 'Aux', 'Lid', 'Sub', 'Miembro', 'Tester'] },
    { id: '1490175650584330330', nombre: 'Responsable', puedeAceptar: ['Aux', 'Lid', 'Sub', 'Miembro', 'Tester'] },
    { id: '1490174010758135959', nombre: 'ADM', puedeAceptar: ['Lid', 'Sub', 'Miembro', 'Tester'] },
    { id: '1490173885948104894', nombre: 'Aux', puedeAceptar: ['Sub', 'Miembro', 'Tester'] }
];

// ============================================================
// CLIENTE
// ============================================================
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
});

const pendingVerifications = new Map();
const usuariosRegistrados = new Map(); // Persistente: userID -> { nombreIC, idIC }
const usuariosPersonalizado = new Map(); // userID -> true (si eligió su propio apodo)

// ============================================================
// CONSTANTES NOMBRADAS (Eliminar Magic Strings)
// ============================================================
const ROLE_PREFIXES = Object.freeze({
    'DEV': 'DEV 🎪',
    'Alta Cupula': '🔥',
    'Responsable': 'Resp.INT 💀',
    'ADM': 'ADM.EVT 🎪',
    'Aux': 'Aux.EVT 🎪',
    'Lid': 'Lid.EVT 🎪',
    'Sub': 'Sub.EVT 🎪',
    'Miembro': 'EvT 🎪',
    'Tester': 'EvT-T 🎪'
});

const ROLE_DISPLAY_NAMES = Object.freeze({
    'DEV': 'DEV',
    'Alta Cupula': 'Alta Cupula',
    'Responsable': 'Responsable',
    'ADM': 'ADM',
    'Aux': 'Aux',
    'Lid': 'Lid',
    'Sub': 'Sub',
    'Miembro': 'Miembro',
    'Tester': 'Tester'
});

// ============================================================
// FUNCIONES HELPER (DRY - Lógica reutilizable)
// ============================================================

// Obtener el rol formateado del usuario (Extraído para eliminar duplicación)
function obtenerRolFormateado(member) {
    const roles = Array.from(member.roles.cache.values());
    const mapeo = {
        'ADM': 'ADM.EvT',
        'Responsable': 'Resp.EvT',
        'Alta Cupula': 'Cupula.EC',
        'Aux': 'Aux.EvT',
        'Sub': 'Sub.EvT',
        'Tester': 'EvT-T',
        'Miembro': 'EvT'
    };
    for (const rol of roles) {
        if (mapeo[rol.name]) return mapeo[rol.name];
    }
    return 'EvT';
}

// Buscar usuario en el servidor (Extraído - lógica duplicada 3 veces)
async function buscarUsuario(guild, textoBusqueda) {
    if (!guild || !textoBusqueda) return null;
    
    // Por mención <@!id>
    const mentionMatch = textoBusqueda.match(/<@!?(\d+)>/);
    if (mentionMatch) {
        try {
            const miembro = await guild.members.fetch(mentionMatch[1]);
            if (miembro) return miembro;
        } catch (e) { /* silencioso */ }
    }
    
    // Por username#discriminator
    if (textoBusqueda.includes('#')) {
        const [username, discriminator] = textoBusqueda.split('#');
        if (discriminator) {
            const user = guild.members.cache.find(m => 
                m.user.username === username && m.user.discriminator === discriminator
            );
            if (user) return user;
        }
    }
    
    // Por username o nickname exacto
    const user = guild.members.cache.find(m => 
        m.user.username.toLowerCase() === textoBusqueda.toLowerCase() ||
        m.nickname?.toLowerCase() === textoBusqueda.toLowerCase()
    );
    if (user) return user;
    
    // Por búsqueda parcial
    const busqueda = textoBusqueda.toLowerCase();
    const candidatos = guild.members.cache.filter(m => 
        m.user.username.toLowerCase().includes(busqueda) ||
        m.nickname?.toLowerCase().includes(busqueda)
    );
    
    if (candidatos.size === 1) return candidatos.first();
    if (candidatos.size > 1) return null; // Múltiples resultados
    
    return null;
}

// Generar formato de nickname (Extraído - lógica duplicada)
function generarNickname(rolNombre, nombreIC, idIC) {
    if (rolNombre === 'Alta Cupula') {
        return `🔥 ${nombreIC} #BuenaGente`;
    }
    
    const prefijo = ROLE_PREFIXES[rolNombre] || 'EvT 🎪';
    return `${prefijo} ${nombreIC} | ${idIC}`;
}

// Verificar si tiene permiso para DM/ClearLogs
function tienePermisoDM(member) {
    return member.roles.cache.has(DEV_ROLE_ID) ||
           member.roles.cache.has(ADM_ROLE_ID) ||
           member.roles.cache.has('1495090186885922979') ||
           member.roles.cache.has('1490175650584330330') ||
           member.roles.cache.has('1490173885948104894');
}

// Enviar embed al canal de logs
async function enviarLog(guild, titulo, descripcion, color = 4895) {
    if (!guild || !CANAL_LOGS) return;
    try {
        const canal = await guild.channels.fetch(CANAL_LOGS);
        if (canal && canal.type === 0) {
            const embed = new EmbedBuilder()
                .setTitle(titulo)
                .setDescription(descripcion)
                .setColor(color)
                .setFooter({ text: 'Staff Eventos - Log' })
                .setTimestamp();
            await canal.send({ embeds: [embed] });
        }
    } catch (e) { /* silencioso */ }
}

// ============================================================
// EVENTOS
// ============================================================
client.once('clientReady', async () => {
    console.log(`✅ Bot conectado: ${client.user.tag}`);
    console.log(`📛 ID: ${client.user.id}`);
    
    const guild = client.guilds.cache.first();
    if (guild) {
        console.log(`📗 Servidor: ${guild.name}`);
        
        // Eliminar comandos antiguos
        try {
            const comandos = await guild.commands.fetch();
            for (const [id, cmd] of comandos) {
                if (['dm_historial', 'dm_preview'].includes(cmd.name)) {
                    await cmd.delete();
                    console.log(`🗑️ /${cmd.name} eliminado`);
                }
            }
            
            // Crear comandos
            await guild.commands.create({ name: 'panel', description: 'Sistema de verificacion del staff' });
            await guild.commands.create({ name: 'dm', description: 'Enviar mensaje a todos' });
            await guild.commands.create({ name: 'clear_logs', description: 'Borrar mensajes del canal de logs' });
            await guild.commands.create({ name: 'registrar', description: 'Registrar datos de usuario manualmente' });
            await guild.commands.create({ name: 'personalizar', description: 'Usar mi propio apodo (no será cambiado)' });
            await guild.commands.create({ name: 'restaurar', description: 'Volver al apodo automático del sistema' });
            console.log(`✅ Comandos creados`);
        } catch (e) {
            console.error('❌ Error:', e);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) await handleSlashCommand(interaction);
        else if (interaction.isButton()) await handleButton(interaction);
        else if (interaction.isStringSelectMenu()) await handleSelectMenu(interaction);
        else if (interaction.isModalSubmit()) await handleModalSubmit(interaction);
    } catch (error) {
        console.error('Error:', error);
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;
        
        // Roles que afectan el nickname (jerarquía: mayor a menor)
        const ROLES_NICKNAME = [
            { id: '1494806027898585248', nombre: 'DEV', prefijo: 'DEV 🎪' },
            { id: '1495090186885922979', nombre: 'Alta Cupula', prefijo: '🔥' },
            { id: '1490175650584330330', nombre: 'Responsable', prefijo: 'Resp.INT 💀' },
            { id: '1490174010758135959', nombre: 'ADM', prefijo: 'ADM.EVT 🎪' },
            { id: '1490173885948104894', nombre: 'Aux', prefijo: 'Aux.EVT 🎪' },
            { id: '1490174081507659917', nombre: 'Lid', prefijo: 'Lid.EVT 🎪' },
            { id: '1490174161069543596', nombre: 'Sub', prefijo: 'Sub.EVT 🎪' },
            { id: '1490174280170737798', nombre: 'Miembro', prefijo: 'EvT 🎪' },
            { id: '1490174348349276401', nombre: 'Tester', prefijo: 'EvT-T 🎪' }
        ];
        
        const addedRoles = newRoles.filter(role => !oldRoles.has(role.id) && Object.keys(AVAILABLE_ROLES).includes(role.id));
        const removedRoles = oldRoles.filter(role => !newRoles.has(role.id) && Object.keys(AVAILABLE_ROLES).includes(role.id));
        
        // Auto-asignar rol adicional (1490384209804791899) excepto para Alta Cupula y Responsable
        if (addedRoles.size > 0) {
            const guild = newMember.guild;
            const rangoAsignado = Array.from(addedRoles.values())[0]?.name;
            
            // Roles que SÍ получают el rol adicional: ADM, Aux, Lid, Sub, Miembro, Tester
            const rolesConRolAdicional = ['ADM', 'Aux', 'Lid', 'Sub', 'Miembro', 'Tester'];
            
            if (rangoAsignado && rolesConRolAdicional.includes(rangoAsignado)) {
                try {
                    const rolAdicional = await guild.roles.fetch('1490384209804791899');
                    if (rolAdicional && !newRoles.has(rolAdicional.id)) {
                        await newMember.roles.add(rolAdicional);
                        console.log(`➕ Rol adicional asignado automáticamente: ${rolAdicional.name} a ${newMember.user.username}`);
                    }
                } catch (e) {
                    console.log(`⚠️ Error al asignar rol adicional: ${e.message}`);
                }
            }
        }
        
        // Log de cambios de rol
        if (addedRoles.size > 0 || removedRoles.size > 0) {
            const guild = newMember.guild;
            
            for (const role of addedRoles.values()) {
                await enviarLog(guild, '🔔 Rol Añadido', `**Usuario:** ${newMember.user.username}\n**Rol:** ${role.name}`, 3066993);
            }
            
            for (const rol of removedRoles.values()) {
                await enviarLog(guild, '🔔 Rol Removido', `**Usuario:** ${newMember.user.username}\n**Rol:** ${rol.name}`, 15158332);
            }
        }
        
        // Auto-nickname usando datos persistentes
        // Respetar nicknames personalizados (cambiados manualmente por el usuario)
        let rolAplicar = null;
        
        for (const rolInfo of ROLES_NICKNAME) {
            if (newRoles.has(rolInfo.id)) {
                rolAplicar = rolInfo;
                break;
            }
        }
        
        // Obtener datos guardados del usuario
        const datosUsuario = usuariosRegistrados.get(newMember.user.id);
        const nickActual = newMember.nickname;
        
        // Detect automáticamente si el usuario cambió su apodo manualmente
        // Comparando con el nick que el sistema pondría
        if (rolAplicar && datosUsuario) {
            const { nombreIC, idIC } = datosUsuario;
            
            // Formato especial para Alta Cupula
            let nickEsperado;
            if (rolAplicar.nombre === 'Alta Cupula') {
                nickEsperado = `🔥 ${nombreIC} #BuenaGente`;
            } else {
                nickEsperado = `${rolAplicar.prefijo} ${nombreIC} | ${idIC}`;
            }
            
            // Si el nick actual es diferente al esperado, el usuario lo cambió manualmente
            if (nickActual && nickActual !== nickEsperado && !usuariosPersonalizado.has(newMember.user.id)) {
                // Verificar que tiene datos registrados para confirmar que es un cambio intencional
                usuariosPersonalizado.set(newMember.user.id, true);
                console.log(`✨ Apodo personalizado detectado: ${newMember.user.tag} → "${nickActual}"`);
            }
        }
        
        // Si el usuario tiene nickname personalizado, respetar su elección
        if (usuariosPersonalizado.has(newMember.user.id)) {
            console.log(`📛 Respetando apodo personalizado: ${newMember.user.tag}`);
            return; // No tocar el nickname
        }
        
        if (rolAplicar && datosUsuario) {
            // Tiene rol EVT y datos guardados → aplicar o actualizar formato
            const { nombreIC, idIC } = datosUsuario;
            
            // Formato especial para Alta Cupula
            let nuevoNick;
            if (rolAplicar.nombre === 'Alta Cupula') {
                nuevoNick = `🔥 ${nombreIC} #BuenaGente`;
            } else {
                nuevoNick = `${rolAplicar.prefijo} ${nombreIC} | ${idIC}`;
            }
            
            // Solo actualizar si es diferente
            if (nickActual !== nuevoNick) {
                try {
                    await newMember.setNickname(nuevoNick);
                    console.log(`📛 Nickname puesto/actualizado: ${newMember.user.tag} → ${nuevoNick}`);
                } catch (e) {
                    console.log(`⚠️ Error nick: ${e.message}`);
                }
            }
        }
        // Solo remover si: NO tiene rol EVT AND tiene datos guardados AND el nick actual tiene formato EVT
        else if (!rolAplicar && datosUsuario && nickActual) {
            const tieneAlgunRol = ROLES_NICKNAME.some(r => newRoles.has(r.id));
            if (!tieneAlgunRol) {
                const tieneFormatoEVT = nickActual.includes('🎪') || 
                                     nickActual.includes('EVT') || 
                                     nickActual.includes('EC') ||
                                     nickActual.includes('INT');
                if (tieneFormatoEVT && !usuariosPersonalizado.has(newMember.user.id)) {
                    try {
                        await newMember.setNickname(null);
                        console.log(`📛 Nickname removido: ${newMember.user.tag}`);
                    } catch (e) {}
                }
            }
        }
    } catch (error) {
        console.error('❌ Error en detector de roles:', error);
    }
});

// ============================================================
// HANDLERS
// ============================================================
async function handleSlashCommand(interaction) {
    console.log(`📤 /${interaction.commandName} por: ${interaction.user.tag}`);
    
    const { commandName } = interaction;
    
    if (commandName === 'panel') {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Sistema de Verificacion | Staff Eventos')
            .setDescription('**BIENVENIDO AL SISTEMA DE VERIFICACION**\nSolicita tu acceso al staff')
            .setColor(25, 25, 112)
            .addFields(
                { name: '📋 Como funciona?', value: '1. Haz clic en "Verificarse"\n2. Completa el formulario\n3. Selecciona tu rango\n4. Espera autorizacion', inline: true },
                { name: '📝 Datos requeridos', value: '• Nombre IC\n• ID de personaje\n• Rango solicitado', inline: true },
                { name: '⚡ Nota', value: 'Alta Cupula solo puede ser aprobado por DEV o Alta Cupula', inline: true }
            )
            .setFooter({ text: 'Staff Eventos v2.0' })
            .setTimestamp();
        
        const button = new ButtonBuilder()
            .setCustomId('btn_verificar')
            .setLabel('Verificarse')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🛡️');
        
        await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
    }
    
    else if (commandName === 'dm') {
        if (!tienePermisoDM(interaction.member)) {
            await interaction.reply({ content: '❌ No tienes permiso.', flags: 64 });
            return;
        }
        
        const modal = new ModalBuilder()
            .setCustomId('modal_dm')
            .setTitle('📨 Menu de Mensajes');
        
        const input = new TextInputBuilder()
            .setCustomId('input_mensaje')
            .setLabel('Mensaje')
            .setPlaceholder('Escribe...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(1500);
        
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }
    
    else if (commandName === 'clear_logs') {
        if (!tienePermisoDM(interaction.member)) {
            await interaction.reply({ content: '❌ No tienes permiso.', flags: 64 });
            return;
        }
        
        await interaction.reply({ content: '🧹 Borrando mensajes...', flags: 64 });
        
        const guild = interaction.guild;
        if (guild && CANAL_LOGS) {
            try {
                const canal = await guild.channels.fetch(CANAL_LOGS);
                if (canal && canal.type === 0) {
                    let borrados = 0;
                    while (true) {
                        const mensajes = await canal.messages.fetch({ limit: 100 });
                        if (mensajes.size === 0) break;
                        
                        for (const [id, msg] of mensajes) {
                            await msg.delete();
                            borrados++;
                        }
                        await new Promise(r => setTimeout(r, 500));
                    }
                    await interaction.followUp({ content: `✅ Se borraron ${borrados} mensajes.`, flags: 64 });
                }
            } catch (e) {
                await interaction.followUp({ content: `❌ Error: ${e.message}`, flags: 64 });
            }
        }
    }
    
    else if (commandName === 'personalizar') {
        // El usuario elige mantener su propio apodo
        usuariosPersonalizado.set(interaction.user.id, true);
        
        await interaction.reply({ 
            content: `✨ **Apodo personalizado guardado**\n\nTu apodo \`${interaction.member.nickname || interaction.user.username}\` será respetado.\n\nUsa \`/restaurar\` para volver al apodo automático.`, 
            flags: 64 
        });
    }
    
    else if (commandName === 'restaurar') {
        // Eliminar personalización y aplicar apodo automático
        usuariosPersonalizado.delete(interaction.user.id);
        
        const datosUsuario = usuariosRegistrados.get(interaction.user.id);
        if (!datosUsuario) {
            await interaction.reply({ 
                content: `❌ No tienes datos registrados. Usa el sistema de verificación primero.`, 
                flags: 64 
            });
            return;
        }
        
        // Buscar rol actual
        let rolAplicar = null;
        for (const rolInfo of ROLES_NICKNAME) {
            if (interaction.member.roles.cache.has(rolInfo.id)) {
                rolAplicar = rolInfo;
                break;
            }
        }
        
        if (rolAplicar) {
            const { nombreIC, idIC } = datosUsuario;
            const nuevoNick = `${rolAplicar.prefijo} ${nombreIC} | ${idIC}`;
            
            try {
                await interaction.member.setNickname(nuevoNick);
                await interaction.reply({ 
                    content: `✅ **Apodo restaurado**\n\n${nuevoNick}`, 
                    flags: 64 
                });
            } catch (e) {
                await interaction.reply({ 
                    content: `❌ Error: ${e.message}`, 
                    flags: 64 
                });
            }
        } else {
            await interaction.reply({ 
                content: `❌ No tienes un rol de staff asignado.`, 
                flags: 64 
            });
        }
    }
    
    else if (commandName === 'registrar') {
        if (!tienePermisoDM(interaction.member)) {
            await interaction.reply({ content: '❌ No tienes permiso.', flags: 64 });
            return;
        }
        
        const modal = new ModalBuilder()
            .setCustomId('modal_registrar')
            .setTitle('📝 Registrar Usuario');
        
        const usuarioInput = new TextInputBuilder()
            .setCustomId('input_usuario')
            .setLabel('👤 Usuario')
            .setPlaceholder('Usuario#0000 o @mencion')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        
        const nombreIC = new TextInputBuilder()
            .setCustomId('input_nombre')
            .setLabel('✏️ Nombre IC')
            .setPlaceholder('Nombre del personaje')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50);
        
        const idIC = new TextInputBuilder()
            .setCustomId('input_id')
            .setLabel('🎮 ID')
            .setPlaceholder('ID del personaje')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(20);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(usuarioInput),
            new ActionRowBuilder().addComponents(nombreIC),
            new ActionRowBuilder().addComponents(idIC)
        );
        
        await interaction.showModal(modal);
    }
}

async function handleButton(interaction) {
    if (interaction.customId === 'btn_verificar') {
        const modal = new ModalBuilder()
            .setCustomId('modal_verificar')
            .setTitle('🛡️ Verificacion');
        
        const nombreIC = new TextInputBuilder()
            .setCustomId('input_nombre')
            .setLabel('✏️ Nombre IC')
            .setPlaceholder('Tu nombre')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50);
        
        const idIC = new TextInputBuilder()
            .setCustomId('input_id')
            .setLabel('🎮 ID')
            .setPlaceholder('Tu ID')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(20);
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(nombreIC),
            new ActionRowBuilder().addComponents(idIC)
        );
        
        await interaction.showModal(modal);
    }
    else if (interaction.customId === 'btn_aceptar' || interaction.customId === 'btn_rechazar') {
        await handleAcceptReject(interaction);
    }
}

async function handleModalSubmit(interaction) {
    const { customId } = interaction;
    
    if (customId === 'modal_verificar') {
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
    }
    
    else if (customId === 'modal_dm') {
        const mensaje = interaction.fields.getTextInputValue('input_mensaje');
        await interaction.deferReply({ flags: 64 });
        
        const guild = interaction.guild;
        let enviados = 0, errores = 0;
        const rolFormateado = obtenerRolFormateado(interaction.member);
        const mensajeFormateado = `📨 **MENSAJE DEL STAFF**\n\n${mensaje}`;
        
        if (guild) {
            const allMembers = await guild.members.fetch();
            
            for (const [userId, member] of allMembers) {
                if (member.user.bot) continue;
                
                // Excluir al rol Alta Cupula de recibir mensajes
                if (member.roles.cache.has(ROL_EXCLUIDO)) continue;
                
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
        
        // Log
        if (guild && CANAL_LOGS) {
            try {
                const canalLog = await guild.channels.fetch(CANAL_LOGS);
                if (canalLog && canalLog.type === 0) {
                    const embedRes = new EmbedBuilder()
                        .setTitle('📨 Mensaje DM Enviado')
                        .setDescription(`**Enviado por:** ${interaction.user}`)
                        .setColor(7506394)
                        .addFields(
                            { name: '💬 Mensaje', value: mensaje.slice(0, 1000) },
                            { name: '✅ Enviados', value: `${enviados}`, inline: true },
                            { name: '❌ Errores', value: `${errores}`, inline: true }
                        )
                        .setFooter({ text: 'Staff Eventos - Log' })
                        .setTimestamp();
                    await canalLog.send({ embeds: [embedRes] });
                }
            } catch (e) {}
        }
        
        await interaction.editReply({ content: `✅ Enviados: ${enviados}\n❌ Errores: ${errores}` });
    }
    
    else if (customId === 'modal_registrar') {
        await interaction.deferReply({ flags: 64 });
        
        const usuarioTexto = interaction.fields.getTextInputValue('input_usuario');
        const nombreIC = interaction.fields.getTextInputValue('input_nombre');
        const idIC = interaction.fields.getTextInputValue('input_id');
        
        const guild = interaction.guild;
        if (!guild) {
            await interaction.editReply({ content: '❌ Error: no se pudo obtener el servidor.' });
            return;
        }
        
        // Buscar usuario (usando función reutilizable DRY)
        const miembro = await buscarUsuario(guild, usuarioTexto);
        if (!miembro) {
            await interaction.editReply({ content: '❌ Usuario no encontrado o hay múltiples coincide.' });
            return;
        }
        
        // Guardar datos
        usuariosRegistrados.set(miembro.user.id, { nombreIC, idIC });
        
        await interaction.editReply({ 
            content: `✅ **Registrado**\n👤 ${miembro.user.username}\n📝 ${nombreIC}\n🆔 ${idIC}` 
        });
        
        console.log(`💾 Usuario registrado manualmente: ${miembro.user.tag} → ${nombreIC} | ${idIC}`);
    }
}

async function handleSelectMenu(interaction) {
    if (interaction.customId !== 'select_rango') return;
    
    const rangoId = interaction.values[0];
    const rangoNombre = AVAILABLE_ROLES[rangoId];
    const datos = pendingVerifications.get(interaction.user.id);
    
    if (!datos) {
        await interaction.reply({ content: '❌ Tiempo expirado.', flags: 64 });
        return;
    }
    
    const { nombreIC, idIC } = datos;
    pendingVerifications.delete(interaction.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle('📋 Nueva Solicitud')
        .setDescription(`**Solicitante:** ${interaction.user}`)
        .setColor(255, 165, 0)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
            { name: 'Nombre IC', value: nombreIC, inline: true },
            { name: 'ID', value: idIC, inline: true },
            { name: 'Rango', value: rangoNombre, inline: true }
        )
        .setFooter({ text: `ID: ${interaction.user.id}` })
        .setTimestamp();
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_aceptar').setLabel('Aceptar').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId('btn_rechazar').setLabel('Rechazar').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );
    
    const guild = interaction.guild;
    if (guild && CANAL_SOLICITUDES) {
        try {
            const canal = await guild.channels.fetch(CANAL_SOLICITUDES);
            if (canal && canal.type === 0) {
                await canal.send({ embeds: [embed], components: [row] });
            }
        } catch (e) {
            console.error('❌ Error al enviar:', e);
        }
    }
    
    await interaction.update({ content: '🎖️ **SOLICITUD ENVIADA**\n⏳ Pendiente de revision', components: [] });
}

async function handleAcceptReject(interaction) {
    // GUARD CLAUSES - Retornos tempranos para evitar anidamiento
    const isAceptar = interaction.customId === 'btn_aceptar';
    const member = interaction.member;
    
    if (!member) {
        await interaction.reply({ content: '❌ Error', flags: 64 });
        return;
    }
    
    // Verificar permisos con búsqueda temprana
    const userRoles = member.roles.cache;
    const rolAutorizador = Object.keys(ROLES_AUTORIZADOS).find(id => userRoles.has(id));
    
    if (!rolAutorizador) {
        await interaction.reply({ content: '❌ Sin permiso.', flags: 64 });
        return;
    }
    
    const jerarquia = JERARQUIA_ROLES.find(j => j.id === rolAutorizador);
    if (!jerarquia) {
        await interaction.reply({ content: '❌ Sin permiso.', flags: 64 });
        return;
    }
    
    // Obtener datos de la solicitud
    const embed = interaction.message.embeds[0];
    const fields = embed.data.fields;
    const rangoSolicitado = fields.find(f => f.name === 'Rango')?.value || '';
    
    // Verificación jerárquica: solo DEV o Alta Cupula pueden aprobar Alta Cupula
    const esAltaCupula = rangoSolicitado === 'Alta Cupula';
    const tieneAltaCupula = userRoles.has('1494805472908152873');
    const tieneDevRol = userRoles.has(DEV_ROLE_ID);
    const esDev = interaction.user.id === DEV_USER_ID || tieneDevRol;
    
    if (esAltaCupula && !tieneAltaCupula && !esDev) {
        await interaction.reply({ content: '❌ Solo DEV o Alta Cupula pueden aceptar Alta Cupula.', flags: 64 });
        return;
    }
    
    if (!jerarquia.puedeAceptar.includes(rangoSolicitado)) {
        await interaction.reply({ content: `❌ No puedes aceptar ${rangoSolicitado}.`, flags: 64 });
        return;
    }
    
    // Deshabilitar botones
    const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_aceptar').setLabel('Aceptar').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('btn_rechazar').setLabel('Rechazar').setStyle(ButtonStyle.Danger).setDisabled(true)
    );
    await interaction.update({ components: [disabledRow] });
    
    // Obtener ID del solicitante
    const footer = embed.footer.text;
    const userIdMatch = footer.match(/ID:\s*(\d+)/);
    const solicitanteId = userIdMatch ? userIdMatch[1] : null;
    
    // Log
    const guild = interaction.guild;
    if (guild && CANAL_LOGS) {
        try {
            const canal = await guild.channels.fetch(CANAL_LOGS);
            if (canal && canal.type === 0) {
                const embedLog = new EmbedBuilder()
                    .setTitle(isAceptar ? '✅ Solicitud Aprobada' : '❌ Solicitud Rechazada')
                    .setDescription(`**Autorizador:** ${interaction.user}`)
                    .setColor(isAceptar ? 3066993 : 15158332)
                    .addFields(
                        { name: 'Solicitante ID', value: solicitanteId || 'desconocido', inline: true },
                        { name: 'Accion', value: isAceptar ? 'Aprobado' : 'Rechazado', inline: true }
                    )
                    .setFooter({ text: 'Staff Eventos - Log' })
                    .setTimestamp();
                await canal.send({ embeds: [embedLog] });
            }
        } catch (e) {}
    }
    
    await interaction.followUp({ content: isAceptar ? '✅ Aceptado.' : '❌ Rechazado.', flags: 64 });
    
    // Procesar aceptación
    if (isAceptar && solicitanteId) {
        const nombre = fields.find(f => f.name === 'Nombre IC')?.value || '';
        const idIC = fields.find(f => f.name === 'ID')?.value || '';
        const rango = fields.find(f => f.name === 'Rango')?.value || '';
        
        if (guild) {
            try {
                const miembro = await guild.members.fetch(solicitanteId);
                if (miembro) {
                    // Guardar datos para uso futuro (persistentes entre reinicios)
                    usuariosRegistrados.set(solicitanteId, { nombreIC: nombre, idIC: idIC });
                    console.log(`💾 Datos guardados: ${nombre} | ${idIC}`);
                    
                    // Asignar rol
                    const rolId = Object.entries(AVAILABLE_ROLES).find(([id, name]) => name === rango)?.[0];
                    if (rolId) {
                        const nuevoRol = await guild.roles.fetch(rolId);
                        if (nuevoRol) {
                            // Primero: agregar nuevo rol (así siempre tiene un rol para evitar race condition)
                            await miembro.roles.add(nuevoRol);
                            
                            // Agregar rol adicional (1490384209804791899) excepto para Alta Cupula y Responsable
                            if (rango !== 'Alta Cupula' && rango !== 'Responsable') {
                                const rolAdicional = await guild.roles.fetch('1490384209804791899');
                                if (rolAdicional) {
                                    await miembro.roles.add(rolAdicional);
                                    console.log(`➕ Rol adicional asignado: ${rolAdicional.name}`);
                                }
                            }
                            
                            // Segundo: remover roles anteriores (después de un pequeño delay para evitar race condition)
                            setTimeout(async () => {
                                for (const [rolIdAntiguo] of Object.entries(AVAILABLE_ROLES)) {
                                    if (rolIdAntiguo === rolId) continue; // No-remover el nuevo rol
                                    const rolAntiguo = await guild.roles.fetch(rolIdAntiguo);
                                    if (rolAntiguo && miembro.roles.cache.has(rolAntiguo.id)) {
                                        try {
                                            await miembro.roles.remove(rolAntiguo);
                                        } catch (e) {}
                                    }
                                }
                            }, 1000);
                            
                            // Setear nickname (usando función DRY)
                            const nuevoNickname = generarNickname(rango, nombre, idIC);
                            
                            try {
                                await miembro.setNickname(nuevoNickname);
                                console.log(`📛 Nickname aplicado: ${nuevoNickname}`);
                            } catch (e) {
                                console.log(`⚠️ Error nick: ${e.message}`);
                            }
                        }
                    }
                    
                    // Enviar DM con embed profesional
                    try {
                        if (isAceptar) {
                            const embedAprobado = new EmbedBuilder()
                                .setTitle('🎪 SISTEMA DE VERIFICACIÓN — APROBADO')
                                .setDescription('✨ **¡Bienvenido al Staff de Eventos!** ✨\n\nJuntos creamos experiencias únicas que se quedan en la memoria.')
                                .setColor(3066993)
                                .addFields(
                                    { name: '📝 Nombre IC', value: nombre, inline: true },
                                    { name: '🆔 ID de Personaje', value: idIC, inline: true },
                                    { name: '⭐ Rango Asignado', value: rango, inline: true }
                                )
                                .addFields(
                                    { name: '📌 Nota', value: 'Tu apodo ha sido actualizado en el servidor. Si no lo ves, contacta a un administrador.', inline: false }
                                )
                                .setFooter({ text: 'Staff Eventos — "Juntos creamos experiencias únicas"' })
                                .setTimestamp();
                            
                            await miembro.send({ embeds: [embedAprobado] });
                        } else {
                            const embedRechazado = new EmbedBuilder()
                                .setTitle('🎪 SOLICITUD — RECHAZADA')
                                .setDescription('Tu solicitud no ha sido aprobada en esta ocasión.')
                                .setColor(15158332)
                                .addFields(
                                    { name: '📝 Nombre IC', value: nombre, inline: true },
                                    { name: '🆔 ID de Personaje', value: idIC, inline: true },
                                    { name: '⭐ Rango Solicitado', value: rango, inline: true }
                                )
                                .setFooter({ text: 'Staff Eventos' })
                                .setTimestamp();
                            
                            await miembro.send({ embeds: [embedRechazado] });
                        }
                    } catch (e) {
                        console.log(`⚠️ Error DM: ${e.message}`);
                    }
                }
            } catch (e) {
                console.error('Error:', e);
            }
        }
    }
}

// ============================================================
// INICIAR
// ============================================================
console.log('🎮 Bot de Verificacion - Staff Eventos');
client.login(TOKEN);
process.on('unhandledRejection', (error) => console.error('❌ Error:', error));

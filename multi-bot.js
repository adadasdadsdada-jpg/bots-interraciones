const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, ModalBuilder, ButtonBuilder, ButtonStyle, TextInputStyle } = require('discord.js');
require('dotenv').config();
const apiClient = require('./apiClient');

// Configurar Dashboard API
apiClient.config({
  apiKey: process.env.DASHBOARD_API_KEY || 'discord-bot-dashboard-2024',
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000'
});

// ============================================================
// CONFIGURACIÓN POR BOT
// ============================================================
// Cada bot tiene su propia config independiente

const BOTS_CONFIG = {
    bot1: {
        nombre: 'Staff Verificacion',
        token: process.env.BOT1_TOKEN || '',
        serverId: process.env.BOT1_SERVER_ID || '',
        canales: {
            solicitudes: process.env.BOT1_CANALES_SOLICITUDES || '',
            logs: process.env.BOT1_CANALES_LOGS || ''
        },
        roles: {
            dev: '1495086629684252836',
            adm: '1490174010758135959',
            altaCupula: '1495090186885922979',
            responsable: '1490175650584330330',
            aux: '1490173885948104894',
            lid: '1490174081507659917',
            sub: '1490174161069543596',
            miembro: '1490174280170737798',
            tester: '1490174348349276401'
        },
        prefijos: {
            dev: 'DEV 🎪',
            altaCupula: '🔥',
            responsable: 'Resp.INT 💀',
            adm: 'ADM.EVT 🎪',
            aux: 'Aux.EVT 🎪',
            lid: 'Lid.EVT 🎪',
            sub: 'Sub.EVT 🎪',
            miembro: 'EvT 🎪',
            tester: 'EvT-T 🎪'
        },
mapeoNick: {
            dev: 'DEV',
            altaCupula: 'Cupula.EC',
            responsable: 'Resp.EvT',
            adm: 'ADM.EvT',
            aux: 'Aux.EvT',
            sub: 'Sub.EvT',
            tester: 'EvT-T',
            miembro: 'EvT'
        },
        // Mensaje DM de verificación aprobada
        mensajeAprobado: {
            titulo: '🎪 SISTEMA DE VERIFICACIÓN — APROBADO',
            descripcion: '✨ **¡Bienvenido al Staff de Eventos!** ✨\n\nJuntos creamos experiencias únicas que se quedan en la memoria.',
            nota: 'Tu apodo ha sido actualizado en el servidor. Si no lo ves, contacta a un administrador.',
            footer: 'Staff Eventos — "Juntos creamos experiencias únicas"'
        },
        // Textos personalizados del bot
        textos: {
            nombreCorto: 'Eventos',
            nombreLargo: 'Staff Eventos',
            emoji: '🎪',
            tituloPanel: '🛡️ Sistema de Verificación | Staff Eventos',
            descPanel: '**BIENVENIDO AL SISTEMA DE VERIFICACIÓN**\nSolicita tu acceso al staff',
            footerPanel: 'Staff Eventos v2.0',
            notaPanel: 'Alta Cupula solo puede ser aprobado por DEV o Alta Cupula'
        },
        usuarios: {
            dev: process.env.BOT1_DEV_USER_ID || ''
        }
    },
    bot2: {
        nombre: 'ENT',
        token: process.env.BOT2_TOKEN || '',
        serverId: process.env.BOT2_SERVER_ID || '',
        canales: {
            solicitudes: process.env.BOT2_CANALES_SOLICITUDES || '',
            logs: process.env.BOT2_CANALES_LOGS || ''
        },
        roles: {
            dev: process.env.BOT2_DEV_ROLE_ID || '',
            adm: process.env.BOT2_ADM_ROLE_ID || '1482522080972111912',
            responsable: process.env.BOT2_RESPONSABLE_ID || '1483935002311004180',
            aux: process.env.BOT2_AUX_ID || '1482523886917517414',
            lid: process.env.BOT2_LID_ID || '1482523459518206257',
            sub: process.env.BOT2_SUB_ID || '1482523331600060538',
            miembro: process.env.BOT2_USUARIO_ID || '1482522709564063805',
            tester: process.env.BOT2_TESTER_ID || '1482523841862303764'
        },
        prefijos: {
            dev: '🤖┋DEV.ENT',
            responsable: '💀┋Resp.INT',
            adm: '🎆┋ADM.ENT',
            aux: '🎆┋Aux.ENT',
            lid: '🎆┋Lid.ENT',
            sub: '🎆┋Sub.ENT',
            miembro: '🎆┋ENT',
            tester: '🎆┋ENT-T'
        },
        mapeoNick: {
            dev: 'DEV.ENT',
            responsable: 'Resp.INT',
            adm: 'ADM.ENT',
            aux: 'Aux.ENT',
            lid: 'Lid.ENT',
            sub: 'Sub.ENT',
            miembro: 'ENT',
            tester: 'ENT-T'
        },
        mensajeAprobado: {
            titulo: '🎆 SISTEMA DE VERIFICACIÓN — APROBADO',
            descripcion: '✨ **¡Bienvenido a ENT!** ✨\n\nJuntos creamos los mejores eventos.',
            nota: 'Tu apodo ha sido actualizado en el servidor. Si no lo ves, contacta a un administrador.',
            footer: 'Staff Entretenimiento - "Juntos creamos los mejores eventos"'
        },
        textos: {
            nombreCorto: 'Entretenimiento',
            nombreLargo: 'Staff Entretenimiento',
            emoji: '🎆',
            tituloPanel: '🎆 Sistema de Verificación | ENT',
            descPanel: '**BIENVENIDO AL SISTEMA DE VERIFICACIÓN**\nSolicita tu acceso',
            footerPanel: 'ENT v2.0',
            notaPanel: ''
        },
        usuarios: {
            dev: process.env.BOT2_DEV_USER_ID || ''
        }
    },
    fiestas: {
        nombre: 'FIESTAS',
        token: process.env.FIESTAS_TOKEN || '',
        serverId: process.env.FIESTAS_SERVER_ID || '1498519623774244985',
        canales: {
            solicitudes: process.env.FIESTAS_CHANNEL_RECEPCION || '1498534574161002577',
            logs: process.env.FIESTAS_LOG_CHANNEL || '1498534563549417654',
            aceptados: process.env.FIESTAS_CHANNEL_ACEPTADOS || '1498534571417796660',
            rechazados: process.env.FIESTAS_CHANNEL_RECHAZADOS || '1498534572684738582',
            setsPendientes: process.env.FIESTAS_CHANNEL_SETS_PENDIENTES || '1498534574161002577',
            setsAceptados: process.env.FIESTAS_CHANNEL_SETS_ACEPTADOS || '1498534571417796660',
            setsRechazados: process.env.FIESTAS_CHANNEL_SETS_RECHAZADOS || '1498534575826014259'
        },
        roles: {
            dev: process.env.FIESTAS_ROLE_DEV || '1498520261228630016',
            altaCupula: process.env.FIESTAS_ROLE_ALTA_CUPULA || '1498534443206443047',
            respInt: process.env.FIESTAS_ROLE_RESP_INT || '1498534444460671077',
            adm: process.env.FIESTAS_ROLE_ADM || '1498534444179656885',
            aux: process.env.FIESTAS_ROLE_AUX || '1498534445060329504',
            lid: process.env.FIESTAS_ROLE_LID || '1498534445886472254',
            sub: process.env.FIESTAS_ROLE_SUB || '1498534447069401130',
            miembro: process.env.FIESTAS_ROLE_MIEMBRO || '1498534448684208289',
            tester: process.env.FIESTAS_ROLE_TESTER || '1498534449770663966'
        },
        prefijos: {
            dev: 'DEV.FT',
            altaCupula: '🔥',
            respInt: 'Resp.INT|💀',
            adm: 'ADM.FT |🎉',
            aux: 'Aux.FT |🎉',
            lid: 'Lid.FT |🎉',
            sub: 'Sub.FT |🎉',
            miembro: 'FT |🎉',
            tester: 'FT-T |🎉'
        },
        mapeoNick: {
            dev: 'DEV.FT',
            altaCupula: '🔥',
            respInt: 'Resp.INT',
            adm: 'ADM.FT',
            aux: 'Aux.FT',
            lid: 'Lid.FT',
            sub: 'Sub.FT',
            miembro: 'FT',
            tester: 'FT-T'
        },
        mensajeAprobado: {
            titulo: '🎆 SISTEMA DE VERIFICACIÓN — APROBADO',
            descripcion: '✨ **¡Bienvenido a FIESTAS!** ✨\n\nJuntos hacemos que cada noche sea inolvidable.',
            nota: 'Tu apodo ha sido actualizado en el servidor. Si no lo ves, contacta a un administrador.',
            footer: 'Staff FIESTAS - "Juntos hacemos que cada noche sea inolvidable"'
        },
        textos: {
            nombreCorto: 'Fiestas',
            nombreLargo: 'Staff Fiestas',
            emoji: '🎉',
            tituloPanel: '🛡️ Sistema de Verificación | Staff Fiestas',
            descPanel: '**BIENVENIDO AL SISTEMA DE VERIFICACIÓN**\nSolicita tu acceso al staff',
            footerPanel: 'Staff Fiestas v2.0',
            notaPanel: 'Alta Cúpula solo puede ser aprobado por DEV o Alta Cúpula'
        },
        usuarios: {
            dev: process.env.FIESTAS_DEV_USER_ID || ''
        }
    }
};

// Mapeo de roles disponibles por bot - construye dinámicamente desde .env
const AVAILABLE_ROLES_BY_BOT = {
    bot1: {
        [process.env.BOT1_ALTA_CUPULA_ID || '']: 'Alta Cúpula',
        [process.env.BOT1_RESPONSABLE_ID || '']: 'Responsable',
        [process.env.BOT1_ADM_ROLE_ID || '']: 'ADM',
        [process.env.BOT1_AUX_ID || '']: 'AUX',
        [process.env.BOT1_LID_ID || '']: 'LID',
        [process.env.BOT1_SUB_ID || '']: 'SUB',
        [process.env.BOT1_MIEMBRO_ID || '']: 'MIEMBRO',
        [process.env.BOT1_TESTER_ID || '']: 'TESTER'
    },
    bot2: {},
    fiestas: {
        '1498534443206443047': '🔥 Alta Cúpula',
        '1498534444460671077': '💀 Resp.INT',
        '1498534444179656885': '🎉 ADM',
        '1498534445060329504': '🎉 AUX',
        '1498534445886472254': '🎉 LID',
        '1498534447069401130': '🎉 SUB',
        '1498534448684208289': '🎉 MIEMBRO',
        '1498534449770663966': '🎉 TESTER'
    }
};

// ============================================================
// CLASE BOT INDIVIDUAL
// ============================================================

// ============================================================
// HELPERS EXTRAÍDOS (DRY)
// ============================================================

function crearEmbedBase(titulo, descripcion, color = 25) {
    return new EmbedBuilder()
        .setTitle(titulo)
        .setDescription(descripcion)
        .setColor(color)
        .setTimestamp();
}

function crearEmbedLog(titulo, descripcion, color, footer) {
    return new EmbedBuilder()
        .setTitle(titulo)
        .setDescription(descripcion)
        .setColor(color)
        .setFooter({ text: footer })
        .setTimestamp();
}

// ============================================================
// CLASE BOT OPTIMIZADA
// ============================================================

class BotStaff {
    constructor(botKey, config) {
        this.key = botKey;
        this.config = config;
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers]
        });
        
        this.pendingVerifications = new Map();
        this.usuariosRegistrados = new Map();
        this.usuariosPersonalizado = new Map();
        
        this.setupEvents();
    }
    
    // Helper para obtener nombre corto
    getNombreCorto() {
        if (this.key === 'bot1') return 'Eventos';
        if (this.key === 'bot2') return 'Entretenimiento';
        if (this.key === 'fiestas') return 'Fiestas';
        return this.key;
    }
    
    getAvailableRoles() {
        // Primero verificar si existe en AVAILABLE_ROLES_BY_BOT
        const rawRoles = AVAILABLE_ROLES_BY_BOT[this.key] || {};
        const roles = {};
        for (const [id, name] of Object.entries(rawRoles)) {
            if (id && name) {
                roles[id] = name;
            }
        }

        if (Object.keys(roles).length > 0) {
            console.log(`[${this.getNombreCorto()}] getAvailableRoles:`, JSON.stringify(roles));
            return roles;
        }

        // Fallback: mapear roles del config con nombres
        const nombresRoles = {
            dev: 'DEV',
            adm: 'ADM',
            responsable: 'Responsable',
            aux: 'Aux',
            lid: 'Lid',
            sub: 'Sub',
            miembro: 'Miembro',
            tester: 'Tester',
            altaCupula: 'Alta Cúpula',
            respInt: 'Resp.INT'
        };

        for (const [key, value] of Object.entries(this.config.roles)) {
            if (key !== 'dev' && value) {
                roles[value] = nombresRoles[key] || key;
            }
        }
        console.log(`[${this.getNombreCorto()}] getAvailableRoles fallback:`, JSON.stringify(roles));
        return roles;
    }
    
    getRolesAutorizados() {
        return this.config.roles;
    }
    
    tienePermisoDM(member) {
        if (!member) return false;
        const rolesPermitidos = Object.values(this.config.roles).filter(Boolean);
        return member.roles.cache.some(rol => rolesPermitidos.includes(rol.id));
    }
    
    obtenerRolFormateado(member) {
        const roles = Array.from(member.roles.cache.values());
        
        // Usar el mapeo del config
        const mapeo = this.config.mapeoNick || {};
        for (const [key, prefix] of Object.entries(mapeo)) {
            if (roles.some(r => r.id === this.config.roles[key])) return prefix;
        }
        return 'User';
    }
    
    generarNickname(rolKey, nombreIC, idIC) {
        const rangoNormalizado = rolKey.toLowerCase()
            .replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u')
            .replace('🎪', '').replace('🎆', '').replace('🔥', '').replace('💀', '')
            .replace('adm', 'adm').replace('aux', 'aux').replace('lid', 'lid')
            .replace('sub', 'sub').replace('miembro', 'miembro').replace('tester', 'tester')
            .replace('alta cúpula', 'altacupula').replace('alta cupula', 'altacupula')
            .replace('resp. int', 'respint').replace('resp int', 'respint').trim();

        if (this.key === 'fiestas') {
            if (rangoNormalizado === 'altacupula') {
                return `🔥 ${nombreIC}`;
            }
            if (rangoNormalizado === 'respint') {
                return `Resp.INT|💀 ${nombreIC}`;
            }
            const prefijo = this.config.mapeoNick?.[rolKey] || this.config.prefijos?.[rolKey] || 'FT';
            return `${prefijo} |🎉${nombreIC} | ${idIC}`;
        }

        if (rangoNormalizado === 'responsable') {
            return `Resp.INT | 💀${nombreIC} #BuenaGente`;
        }

        const prefijo = this.config.prefijos?.[rangoNormalizado] || (this.key === 'bot1' ? 'EvT 🎪' : 'ENT 🎆');
        const nombreRol = prefijo.includes('┋')
            ? prefijo.split('┋')[1].trim()
            : prefijo.replace('🎪', '').replace('🎆', '').replace('🤖', '').trim();

        const emoji = this.key === 'bot1' ? '🎪' : '🎆';
        return `${nombreRol} | ${emoji}${nombreIC} | ${idIC}`;
    }
    
    async enviarLog(guild, titulo, descripcion, color = 4895) {
        if (!guild || !this.config.canales.logs) return;
        try {
            const canal = await guild.channels.fetch(this.config.canales.logs);
            if (canal && canal.type === 0) {
                const embed = new EmbedBuilder()
                    .setTitle(`📋 ${titulo}`)
                    .setDescription(descripcion)
                    .setColor(color)
                    .setFooter({ text: `${this.config.nombre} - Log` })
                    .setTimestamp();
                await canal.send({ embeds: [embed] });
            }
        } catch (e) { console.log(`[${this.getNombreCorto()}] Log error: ${e.message}`); }
    }
    
    setupEvents() {
        const bot = this;
        
        // Ready
        this.client.once('clientReady', async () => {
            const nombreCorto = this.getNombreCorto();
            console.log(`\n✅ [${nombreCorto}] Bot conectado: ${bot.client.user.tag}`);
            console.log(`📛 [${nombreCorto}] ID: ${bot.client.user.id}`);

            const guild = bot.client.guilds.cache.first();
            if (guild) {
                console.log(`📗 [${nombreCorto}] Servidor: ${guild.name}`);
                console.log(`📗 [${nombreCorto}] Server ID: ${guild.id}`);

                // Debug: listar TODOS los roles del servidor
                const roles = await guild.roles.fetch();
                console.log(`\n📋 [${nombreCorto}] === ROLES DEL SERVIDOR ===`);
                console.log(`   Server ID: ${guild.id}`);
                for (const [id, role] of roles) {
                    if (!role.managed && role.name !== '@everyone') {
                        console.log(`   "${role.name}": "${id}",`);
                    }
                }

                // Mostrar roles configurados vs roles del servidor
                console.log(`\n📋 [${nombreCorto}] === ROLES CONFIGURADOS ===`);
                for (const [key, id] of Object.entries(this.config.roles)) {
                    const serverRole = roles.find(r => r.id === id);
                    const status = serverRole ? `✅ ${serverRole.name}` : '❌ NO ENCONTRADO';
                    console.log(`   ${key}: ${id} -> ${status}`);
                }

                bot.registrarComandos(guild);
            }
        });
        
        // Interaction
        this.client.on('interactionCreate', async (interaction) => {
            console.log(`[${this.getNombreCorto()}] Interaction received: ${interaction.type}, commandName=${interaction.commandName || 'N/A'}, customId=${interaction.customId || 'N/A'}`);

            // Ignorar interacciones de otros servidores
            if (interaction.guild?.id && interaction.guild.id !== this.config.serverId) {
                console.log(`[${this.getNombreCorto()}] Ignored - wrong server: ${interaction.guild?.id}`);
                return;
            }
            // Ignorar si ya fue respondida
            if (interaction.replied || interaction.deferred) {
                console.log(`[${this.getNombreCorto()}] Ignored - already replied/deferred`);
                return;
            }

            try {
                if (interaction.isChatInputCommand()) {
                    console.log(`[${this.getNombreCorto()}] Handling slash command: ${interaction.commandName}`);
                    await this.handleSlashCommand(interaction);
                }
                else if (interaction.isButton()) {
                    console.log(`[${this.getNombreCorto()}] Handling button: ${interaction.customId}`);
                    await this.handleButton(interaction);
                }
                else if (interaction.isStringSelectMenu()) {
                    console.log(`[${this.getNombreCorto()}] Handling select: ${interaction.customId}`);
                    await this.handleSelectMenu(interaction);
                }
                else if (interaction.isModalSubmit()) {
                    console.log(`[${this.getNombreCorto()}] Handling modal: ${interaction.customId}`);
                    await this.handleModalSubmit(interaction);
                }
            } catch (error) {
                console.error(`[${this.getNombreCorto()}] Interaction error:`, error.message);
                if (error.code) console.error(`[${this.getNombreCorto()}] Error code: ${error.code}`);
                if (error.stack) console.error(`[${this.getNombreCorto()}] Stack: ${error.stack}`);
            }
        });
        
        // Role Update
        this.client.on('guildMemberUpdate', async (oldMember, newMember) => {
            await bot.handleRoleUpdate(oldMember, newMember);
        });
    }
    
    async registrarComandos(guild) {
        try {
            const comandos = [
                { name: 'panel', description: 'Sistema de verificación' },
                { name: 'dm', description: 'Enviar mensaje a todos' },
                { name: 'clear_logs', description: 'Borrar mensajes del canal de logs' },
                { name: 'registrar', description: 'Registrar datos de usuario manualmente' },
                { name: 'personalizar', description: 'Usar mi propio apodo' },
                { name: 'restaurar', description: 'Volver al apodo automático' }
            ];
            
            for (const cmd of comandos) {
                await guild.commands.create(cmd);
            }
            
            console.log(`✅ [${this.getNombreCorto()}] Comandos creados`);
        } catch (e) {
            console.error(`[${this.getNombreCorto()}] Error al crear comandos:`, e);
        }
    }
    
    async handleSlashCommand(interaction) {
        console.log(`[${this.getNombreCorto()}] handleSlashCommand started for: ${interaction.commandName}`);

        const { commandName } = interaction;

        // Ignorar comandos de otros servidores
        if (interaction.guild?.id && interaction.guild.id !== this.config.serverId) return;
        // Ignorar si ya fue respondida
        if (interaction.replied || interaction.deferred) return;

        if (commandName === 'panel') {
            const txt = this.config.textos || {};
            const embed = new EmbedBuilder()
                .setTitle(txt.tituloPanel || `🛡️ Sistema de Verificación | ${this.config.nombre}`)
                .setDescription(txt.descPanel || '**BIENVENIDO AL SISTEMA DE VERIFICACIÓN**\nSolicita tu acceso')
                .setColor(25, 25, 112)
                .addFields(
                    { name: '📋 Cómo funciona?', value: '1. Haz clic en "Verificarse"\n2. Completa el formulario\n3. Selecciona tu rango\n4. Espera autorización', inline: true }
                );
            
            if (txt.notaPanel) {
                embed.addFields({ name: '⚡ Nota', value: txt.notaPanel, inline: true });
            }
            
            embed.setFooter({ text: txt.footerPanel || `${this.config.nombre} v2.0` }).setTimestamp();
            
            const button = new ButtonBuilder()
                .setCustomId('btn_verificar')
                .setLabel('Verificarse')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🛡️');
            
            await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
        }
        
        else if (commandName === 'dm') {
            if (!this.tienePermisoDM(interaction.member)) {
                await interaction.reply({ content: '❌ No tienes permiso.', flags: 64 });
                return;
            }
            
            const modal = new ModalBuilder()
                .setCustomId('modal_dm')
                .setTitle('📨 Menú de Mensajes');
            
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
            if (!this.tienePermisoDM(interaction.member)) {
                await interaction.reply({ content: '❌ No tienes permiso.', flags: 64 });
                return;
            }
            
            await interaction.reply({ content: '🧹 Borrando mensajes...', flags: 64 });
            
            const guild = interaction.guild;
            if (guild && this.config.canales.logs) {
                try {
                    const canal = await guild.channels.fetch(this.config.canales.logs);
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
            this.usuariosPersonalizado.set(interaction.user.id, true);
            await interaction.reply({ content: `✨ **Apodo personalizado guardado**\nUsa \`/restaurar\` para volver al apodo automático.`, flags: 64 });
        }
        
        else if (commandName === 'restaurar') {
            this.usuariosPersonalizado.delete(interaction.user.id);
            await interaction.reply({ content: `✅ **Apodo restaurado**`, flags: 64 });
        }
        
        else if (commandName === 'registrar') {
            if (!this.tienePermisoDM(interaction.member)) {
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
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);
            
            const idIC = new TextInputBuilder()
                .setCustomId('input_id')
                .setLabel('🎮 ID')
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
    
    async handleButton(interaction) {
        console.log(`[${this.getNombreCorto()}] handleButton started for: ${interaction.customId}`);

        if (interaction.guild?.id && interaction.guild.id !== this.config.serverId) return;
        if (interaction.replied || interaction.deferred) return;

        if (interaction.customId === 'btn_verificar') {
            console.log(`[${this.getNombreCorto()}] Button handler: showing modal for ${interaction.user.tag}`);
            const modal = new ModalBuilder()
                .setCustomId('modal_verificar')
                .setTitle('🛡️ Verificación');

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

            try {
                await interaction.showModal(modal);
                console.log(`[${this.getNombreCorto()}] Modal shown successfully`);
            } catch (err) {
                console.error(`[${this.getNombreCorto()}] showModal error:`, err.message);
                console.error(`[${this.getNombreCorto()}] Error code: ${err.code}`);
                console.error(`[${this.getNombreCorto()}] showModal stack:`, err.stack);
            }
        }
        else if (interaction.customId === 'btn_aceptar' || interaction.customId === 'btn_rechazar') {
            await this.handleAcceptReject(interaction);
        }
    }
    
    async handleModalSubmit(interaction) {
        console.log(`[${this.getNombreCorto()}] handleModalSubmit started for: ${interaction.customId}`);

        if (interaction.guild?.id && interaction.guild.id !== this.config.serverId) return;
        if (interaction.replied || interaction.deferred) return;

        const { customId } = interaction;
        
        if (customId === 'modal_verificar') {
            const nombreIC = interaction.fields.getTextInputValue('input_nombre');
            const idIC = interaction.fields.getTextInputValue('input_id');
            
            this.pendingVerifications.set(interaction.user.id, { nombreIC, idIC });
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_rango')
                .setPlaceholder('Selecciona tu rango...');

            const availableRoles = this.getAvailableRoles();
            console.log(`[${this.getNombreCorto()}] availableRoles count: ${Object.keys(availableRoles || {}).length}`);
            console.log(`[${this.getNombreCorto()}] availableRoles:`, JSON.stringify(availableRoles || {}));

            if (!availableRoles || Object.keys(availableRoles).length === 0) {
                console.log(`[${this.getNombreCorto()}] No available roles, using fallback`);
                selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel('Miembro').setValue('1490174280170737798'));
            } else {
                for (const [id, name] of Object.entries(availableRoles)) {
                    if (id && name) {
                        console.log(`[${this.getNombreCorto()}] Adding option: ${id} -> ${name}`);
                        selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel(name).setValue(id));
                    }
                }
            }

            console.log(`[${this.getNombreCorto()}] selectMenu options count: ${selectMenu.options.length}`);

            if (selectMenu.options.length === 0) {
                await interaction.reply({ content: '❌ No hay roles disponibles. Contacta a un admin.', flags: 64 });
                return;
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
            const usuariosEnviados = [];
            const rolesConPermiso = Object.values(this.config.roles).filter(Boolean);
            const mensajeFormateado = `📨 **MENSAJE DEL STAFF**\n\n${mensaje}`;
            
            // Rol excluido de mensajes (Alta Cupula y Resp.INT no reciben DM)
            const rolesExcluidos = [];
            if (this.config.roles.altaCupula) rolesExcluidos.push(this.config.roles.altaCupula);
            if (this.config.roles.respInt) rolesExcluidos.push(this.config.roles.respInt);
            
            if (guild) {
                const allMembers = await guild.members.fetch();
                
                for (const [userId, member] of allMembers) {
                    if (member.user.bot) continue;
                    
                    // Excluir roles de Alta Cupula y Resp.INT de recibir mensajes
                    if (rolesExcluidos.length > 0 && member.roles.cache.has(rolesExcluidos[0])) continue;
                    
                    const tieneRol = member.roles.cache.some(rol => rolesConPermiso.includes(rol.id));
                    if (!tieneRol) continue;
                    
                    try {
                        await member.send(mensajeFormateado);
                        usuariosEnviados.push(`<@${userId}>`);
                        enviados++;
                    } catch (e) { errores++; }
                }
            }
            
            // Log con la lista de usuarios
            const txt = this.config.textos || {};
            if (guild && this.config.canales.logs) {
                try {
                    const canalLog = await guild.channels.fetch(this.config.canales.logs);
                    if (canalLog && canalLog.type === 0) {
                        const embedLog = new EmbedBuilder()
                            .setTitle('📨 Mensaje DM Enviado')
                            .setDescription(`**Enviado por:** ${interaction.user}`)
                            .setColor(7506394)
                            .addFields(
                                { name: '💬 Mensaje', value: mensaje.slice(0, 1000) },
                                { name: '✅ Enviados', value: `${enviados}`, inline: true },
                                { name: '❌ Errores', value: `${errores}`, inline: true }
                            );
                        
                        if (usuariosEnviados.length > 0) {
                            const usuariosTexto = usuariosEnviados.join(', ');
                            embedLog.addFields({ name: '👥 Usuarios', value: usuariosTexto.slice(0, 1000) });
                        }
                        
                        embedLog.setFooter({ text: `${txt.nombreLargo || this.config.nombre} - Log` }).setTimestamp();
                        await canalLog.send({ embeds: [embedLog] });
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
            
            let miembro = null;
            const mentionMatch = usuarioTexto.match(/<@!?(\d+)>/);
            if (mentionMatch) {
                try { miembro = await guild.members.fetch(mentionMatch[1]); } catch (e) {}
            }
            
            if (!miembro) {
                const user = guild.members.cache.find(m => 
                    m.user.username.toLowerCase() === usuarioTexto.toLowerCase() ||
                    m.nickname?.toLowerCase() === usuarioTexto.toLowerCase()
                );
                if (user) miembro = user;
            }
            
            if (!miembro) {
                await interaction.editReply({ content: '❌ Usuario no encontrado.' });
                return;
            }
            
            this.usuariosRegistrados.set(miembro.user.id, { nombreIC, idIC });
            await interaction.editReply({ content: `✅ **Registrado**\n👤 ${miembro.user.username}\n📝 ${nombreIC}\n🆔 ${idIC}` });
        }
    }
    
    async handleSelectMenu(interaction) {
        console.log(`[${this.getNombreCorto()}] handleSelectMenu started for: ${interaction.customId}`);

        if (interaction.guild?.id && interaction.guild.id !== this.config.serverId) return;
        if (interaction.replied || interaction.deferred) return;
        if (interaction.customId !== 'select_rango') return;
        
        const rangoId = interaction.values[0];
        const availableRoles = this.getAvailableRoles();
        const rangoNombre = availableRoles[rangoId] || rangoId || 'Desconocido';
        const datos = this.pendingVerifications.get(interaction.user.id);
        
        if (!datos) {
            await interaction.reply({ content: '❌ Tiempo expirado.', flags: 64 });
            return;
        }
        
        const { nombreIC, idIC } = datos;
        this.pendingVerifications.delete(interaction.user.id);

        const safeNombreIC = String(nombreIC || 'N/A').substring(0, 1024);
        const safeIdIC = String(idIC || 'N/A').substring(0, 1024);
        const safeRango = String(rangoNombre || 'Desconocido').substring(0, 1024);

        console.log(`[${this.getNombreCorto()}] Creating embed with: nombreIC=${safeNombreIC}, idIC=${safeIdIC}, rango=${safeRango}`);

        const embed = new EmbedBuilder()
            .setTitle('📋 Nueva Solicitud')
            .setDescription(`**Solicitante:** ${interaction.user ? interaction.user.toString() : 'Unknown'}`)
            .setColor(255, 165, 0)
            .setThumbnail(interaction.user?.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { name: 'Nombre IC', value: safeNombreIC, inline: true },
                { name: 'ID', value: safeIdIC, inline: true },
                { name: 'Rango', value: safeRango, inline: true }
            )
            .setFooter({ text: `ID: ${interaction.user ? interaction.user.id : 'unknown'}` })
            .setTimestamp();
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_aceptar').setLabel('Aceptar').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('btn_rechazar').setLabel('Rechazar').setStyle(ButtonStyle.Danger).setEmoji('❌')
        );
        
        const guild = interaction.guild;
        if (guild && this.config.canales.solicitudes) {
            try {
                const canal = await guild.channels.fetch(this.config.canales.solicitudes);
                if (canal && canal.type === 0) {
                    await canal.send({ embeds: [embed], components: [row] });
                }
            } catch (e) {
                console.error(`[${this.getNombreCorto()}] Error al enviar:`, e);
            }
        }
        
        await interaction.update({ content: '🎖️ **SOLICITUD ENVIADA**\n⏳ Pendiente de revisión', components: [] });
        
        // Enviar al dashboard
        try {
            await apiClient.nuevaSolicitud({
                bot_id: this.key,
                user_id: interaction.user.id,
                username: interaction.user.username,
                nombre_ic: nombreIC,
                id_ic: idIC,
                rango: rangoNombre,
                estado: 'pendiente'
            });
        } catch (e) {
            console.log(`[${this.getNombreCorto()}] Dashboard API error:`, e.message);
        }
    }
    
    async handleAcceptReject(interaction) {
        const isAceptar = interaction.customId === 'btn_aceptar';
        const member = interaction.member;
        
        if (!member) {
            await interaction.reply({ content: '❌ Error', flags: 64 });
            return;
        }
        
        if (!this.tienePermisoDM(member)) {
            await interaction.reply({ content: '❌ Sin permiso.', flags: 64 });
            return;
        }
        
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_aceptar').setLabel('Aceptar').setStyle(ButtonStyle.Success).setDisabled(true),
            new ButtonBuilder().setCustomId('btn_rechazar').setLabel('Rechazar').setStyle(ButtonStyle.Danger).setDisabled(true)
        );
        await interaction.update({ components: [disabledRow] });
        
        const embed = interaction.message.embeds[0];
        const fields = embed.data.fields;
        const rangoSolicitado = fields.find(f => f.name === 'Rango')?.value || '';
        
        const footer = embed.footer.text;
        const userIdMatch = footer.match(/ID:\s*(\d+)/);
        const solicitanteId = userIdMatch ? userIdMatch[1] : null;
        
        const guild = interaction.guild;
        
        if (guild && this.config.canales.logs) {
            try {
                const canalLog = await guild.channels.fetch(this.config.canales.logs);
                if (canalLog && canalLog.type === 0) {
                    const embedLog = new EmbedBuilder()
                        .setTitle(isAceptar ? '✅ Solicitud Aprobada' : '❌ Solicitud Rechazada')
                        .setDescription(`**Autorizador:** ${interaction.user}`)
                        .setColor(isAceptar ? 3066993 : 15158332)
                        .addFields(
                            { name: 'Solicitante ID', value: solicitanteId || 'desconocido', inline: true },
                            { name: 'Acción', value: isAceptar ? 'Aprobado' : 'Rechazado', inline: true }
                        )
                        .setFooter({ text: `${this.config.nombre} - Log` })
                        .setTimestamp();
                    await canalLog.send({ embeds: [embedLog] });
                }
            } catch (e) {}
        }
        
        await interaction.followUp({ content: isAceptar ? '✅ Aceptado.' : '❌ Rechazado.', flags: 64 });
        
        // Enviar log al dashboard
        try {
            await apiClient.crearLog({
                bot_id: this.key,
                tipo: isAceptar ? 'verificacion' : 'rechazo',
                titulo: isAceptar ? '✅ Solicitud Aprobada' : '❌ Solicitud Rechazada',
                descripcion: `Solicitante: ${solicitanteId || 'desconocido'} - Rango: ${rangoSolicitado}`,
                usuario: interaction.user.username
            });
            
            // Actualizar stats
            await apiClient.actualizarStats(this.key, {
                solicitudes_pendientes: 0,
                solicitudes_aprobadas: isAceptar ? 1 : 0,
                solicitudes_rechazadas: isAceptar ? 0 : 1,
                total_usuarios: isAceptar ? 1 : 0
            });
        } catch (e) {
            console.log(`[${this.getNombreCorto()}] Dashboard API error:`, e.message);
        }
        
        if (isAceptar && solicitanteId) {
            const nombre = fields.find(f => f.name === 'Nombre IC')?.value || '';
            const idIC = fields.find(f => f.name === 'ID')?.value || '';
            
            if (guild) {
                try {
                    const miembro = await guild.members.fetch(solicitanteId);
                    if (miembro) {
                        this.usuariosRegistrados.set(solicitanteId, { nombreIC: nombre, idIC: idIC });
                        
                        // Buscar el ID del rol según el nombre del rango
                        const rangoLower = rangoSolicitado.toLowerCase();
                        const rolId = Object.entries(this.config.roles).find(([key, id]) => {
                            const mapeoNombres = {
                                'dev': ['dev', 'DEV', 'Dev'],
                                'adm': ['adm', 'ADM', 'Adm'],
                                'responsable': ['responsable', 'Responsable', 'RESPONSABLE'],
                                'aux': ['aux', 'AUX', 'Aux'],
                                'lid': ['lid', 'LID', 'Lid'],
                                'sub': ['sub', 'SUB', 'Sub'],
                                'miembro': ['miembro', 'MIEMBRO', 'Miembro'],
                                'tester': ['tester', 'TESTER', 'Tester'],
                                'altacupula': ['alta cupula', 'alta cúpula', 'Alta Cúpula', 'ALTA CÚPULA', '🔥 alta cúpula'],
                                'respint': ['resp int', 'resp. int', 'Resp.INT', 'respint', '💀 resp. int']
                            };
                            return mapeoNombres[key]?.includes(rangoLower);
                        })?.[1];
                        
                        if (rolId) {
                            const nuevoRol = await guild.roles.fetch(rolId);
                            if (nuevoRol) {
                                await miembro.roles.add(nuevoRol);
                                console.log(`[${this.getNombreCorto()}] ➕ Rol asignado: ${nuevoRol.name}`);
                            }
                        }
                        
                        // Generar y aplicar nickname
                        const nuevoNickname = this.generarNickname(rangoSolicitado.toLowerCase(), nombre, idIC);
                        try {
                            await miembro.setNickname(nuevoNickname);
                            console.log(`[${this.getNombreCorto()}] 📛 Nickname: ${nuevoNickname}`);
                        } catch (e) {
                            console.log(`[${this.getNombreCorto()}] ⚠️ Error nick: ${e.message}`);
                        }
                        
                        // Mensaje de DM personalizado según el bot
                        const msgConfig = this.config.mensajeAprobado || {};
                        
                        try {
                            const embedAprobado = new EmbedBuilder()
                                .setTitle(msgConfig.titulo || '✅ SISTEMA DE VERIFICACIÓN — APROBADO')
                                .setDescription(msgConfig.descripcion || `¡Bienvenido a ${this.config.nombre}!`)
                                .setColor(3066993)
                                .addFields(
                                    { name: '📝 Nombre IC', value: nombre, inline: true },
                                    { name: '🆔 ID de Personaje', value: idIC, inline: true },
                                    { name: '⭐ Rango Asignado', value: rangoSolicitado, inline: true }
                                )
                                .addFields(
                                    { name: '📌 Nota', value: msgConfig.nota || 'Tu apodo ha sido actualizado.', inline: false }
                                )
                                .setFooter({ text: msgConfig.footer || this.config.nombre })
                                .setTimestamp();
                            
                            await miembro.send({ embeds: [embedAprobado] });
                        } catch (e) {
                            console.log(`[${this.getNombreCorto()}] DM error: ${e.message}`);
                        }
                    }
                } catch (e) {
                    console.error(`[${this.getNombreCorto()}] Error:`, e);
                }
            }
        }
    }
    
    async handleRoleUpdate(oldMember, newMember) {
        try {
            const oldRoles = oldMember.roles.cache;
            const newRoles = newMember.roles.cache;
            
            const availableRoles = this.getAvailableRoles();
            
            const addedRoles = newRoles.filter(role => !oldRoles.has(role.id) && Object.keys(availableRoles).includes(role.id));
            const removedRoles = oldRoles.filter(role => !newRoles.has(role.id) && Object.keys(availableRoles).includes(role.id));
            
            if (addedRoles.size > 0 || removedRoles.size > 0) {
                const guild = newMember.guild;
                
                for (const role of addedRoles.values()) {
                    await this.enviarLog(guild, '🔔 Rol Añadido', `**Usuario:** ${newMember.user.username}\n**Rol:** ${role.name}`, 3066993);
                }
                
                for (const rol of removedRoles.values()) {
                    await this.enviarLog(guild, '🔔 Rol Removido', `**Usuario:** ${newMember.user.username}\n**Rol:** ${rol.name}`, 15158332);
                }
            }
        } catch (error) {
            console.error(`[${this.key}] Error en handleRoleUpdate:`, error);
        }
    }
    
async start() {
        const nombreCorto = this.key === 'bot1' ? 'Eventos' : 'Entretenimiento';
        try {
            await this.client.login(this.config.token);
            console.log(`🚀 [${nombreCorto}] Iniciando...`);
        } catch (e) {
            console.error(`[${nombreCorto}] Error al iniciar: ${e.message}`);
        }
    }
}

// ============================================================
// INICIAR TODOS LOS BOTS
// ============================================================

async function iniciarTodosLosBots() {
    console.log('═══════════════════════════════════════');
    console.log('🎮 MULTI-BOT SYSTEM');
    console.log('═══════════════════════════════════════');
    
    const keys = Object.keys(BOTS_CONFIG);
    console.log(`📋 Bots configurados: ${keys.join(', ')}`);
    
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const config = BOTS_CONFIG[key];
        console.log(`\n🔄 Procesando bot ${i+1}/${keys.length}: ${key}`);
        
        if (config.token) {
            try {
                const bot = new BotStaff(key, config);
                await bot.start();
                console.log(`✅ ${key} iniciado correctamente`);
            } catch (e) {
                console.error(`❌ [${key}] Error al iniciar: ${e.message}`);
            }
        } else {
            console.log(`⚠️ [${key}] Token no configurado, saltando...`);
        }
    }
    console.log('\n✅ Todos los bots procesados');
}

iniciarTodosLosBots();

process.on('unhandledRejection', (error) => console.error('❌ Error:', error));
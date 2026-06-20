require('dotenv').config({ path: '../.env' })
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js')
const fs = require('fs')
const path = require('path')

const TOKEN     = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.DISCORD_CLIENT_ID

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ Faltan DISCORD_TOKEN o DISCORD_CLIENT_ID en .env')
  process.exit(1)
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
client.commands = new Collection()

// Cargar comandos
const commandsPath = path.join(__dirname, 'commands')
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))
const commandsData = []

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file))
  client.commands.set(command.data.name, command)
  commandsData.push(command.data.toJSON())
  console.log(`✅ Comando cargado: /${command.data.name}`)
}

// Registrar slash commands automáticamente al iniciar
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN)
  try {
    console.log('🔄 Registrando slash commands...')
    const guildId = process.env.DISCORD_GUILD_ID

    if (guildId) {
      // Guild-specific (instantáneo)
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, guildId), { body: commandsData })
      console.log(`✅ Slash commands registrados en el servidor ${guildId}`)
    } else {
      // Global (puede tardar hasta 1 hora en propagarse)
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandsData })
      console.log('✅ Slash commands registrados globalmente')
    }
  } catch (err) {
    console.error('❌ Error registrando comandos:', err.message)
  }
}

// Eventos
client.once('clientReady', async () => {
  console.log(`\n⚔️  LoL Scout Bot conectado como ${client.user.tag}`)
  console.log(`📡 Servidores: ${client.guilds.cache.size}`)
  client.user.setPresence({
    activities: [{ name: '/scout | /champion | /mastery', type: 3 }],
    status: 'online',
  })
  await registerCommands()
})

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction)
  } catch (err) {
    console.error(`[${interaction.commandName}]`, err)
    const msg = { content: '❌ Ocurrió un error ejecutando este comando.', ephemeral: true }
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(msg)
    } else {
      await interaction.reply(msg)
    }
  }
})

client.login(TOKEN)

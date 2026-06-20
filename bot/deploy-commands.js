// Uso alternativo para registrar comandos manualmente
// node deploy-commands.js
require('dotenv').config({ path: '../.env' })
const { REST, Routes } = require('discord.js')
const fs   = require('fs')
const path = require('path')

const TOKEN     = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.DISCORD_CLIENT_ID
const GUILD_ID  = process.env.DISCORD_GUILD_ID

const commands = []
const commandsPath = path.join(__dirname, 'commands')
fs.readdirSync(commandsPath).filter(f => f.endsWith('.js')).forEach(file => {
  const cmd = require(path.join(commandsPath, file))
  commands.push(cmd.data.toJSON())
})

const rest = new REST({ version: '10' }).setToken(TOKEN)

;(async () => {
  try {
    console.log(`Registrando ${commands.length} slash command(s)...`)
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
      console.log(`✅ Registrados en guild ${GUILD_ID} (instantáneo)`)
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
      console.log('✅ Registrados globalmente (puede tardar 1h en propagarse)')
    }
  } catch (err) {
    console.error(err)
  }
})()

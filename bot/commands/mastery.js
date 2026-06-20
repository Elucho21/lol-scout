const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))

const API = process.env.LOL_API_URL || 'http://localhost:3001/api'

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mastery')
    .setDescription('Muestra la maestría de un jugador con un campeón')
    .addStringOption(o =>
      o.setName('nombre').setDescription('Game Name').setRequired(true))
    .addStringOption(o =>
      o.setName('tag').setDescription('Tag (ej: LAS)').setRequired(true))
    .addIntegerOption(o =>
      o.setName('champion_id').setDescription('ID del campeón (ej: 157 = Yasuo)').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply()

    const nombre     = interaction.options.getString('nombre')
    const tag        = interaction.options.getString('tag')
    const championId = interaction.options.getInteger('champion_id')

    try {
      // Primero obtenemos el PUUID
      const playerRes = await fetch(`${API}/player/${encodeURIComponent(nombre)}/${encodeURIComponent(tag)}`)
      if (!playerRes.ok) {
        return interaction.editReply(`❌ No se encontró **${nombre}#${tag}**.`)
      }
      const player = await playerRes.json()

      // Luego la maestría
      const masteryRes = await fetch(`${API}/mastery/${player.puuid}/${championId}?platform=${player.platform}`)
      const mastery = await masteryRes.json()

      const stars = '⭐'.repeat(Math.min(mastery.championLevel, 7))
      const pts   = mastery.championPoints.toLocaleString()

      const embed = new EmbedBuilder()
        .setColor(mastery.championLevel >= 6 ? 0xf4c874 : 0x1a2a3a)
        .setTitle(`🎯 Maestría — ${player.gameName}#${player.tagLine}`)
        .addFields(
          { name: 'Campeón ID', value: `${championId}`, inline: true },
          { name: 'Nivel',      value: `${stars} (${mastery.championLevel})`, inline: true },
          { name: 'Puntos',     value: pts, inline: true },
        )
        .setFooter({ text: 'LoL Scout' })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (err) {
      console.error('[mastery]', err)
      await interaction.editReply('❌ Error al obtener la maestría.')
    }
  }
}

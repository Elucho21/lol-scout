const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))

const API = process.env.LOL_API_URL || 'http://localhost:3001/api'

const TIER_COLORS = { 'S+': 0xf4c874, S: 0xf0a742, A: 0x00c878, B: 0x6a8cff, C: 0xa8b4c8, D: 0xe84057 }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('champion')
    .setDescription('Muestra stats de un campeón desde LoLalytics')
    .addStringOption(o =>
      o.setName('nombre').setDescription('Nombre del campeón (ej: Yasuo)').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply()
    // Aviso: Puppeteer puede tardar ~10s
    await interaction.editReply('🔍 Analizando campeón en LoLalytics… (~10s)')

    const nombre = interaction.options.getString('nombre')

    try {
      const res = await fetch(`${API}/champion/${encodeURIComponent(nombre)}`, { timeout: 30000 })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return interaction.editReply(`❌ Error: ${body.error ?? `HTTP ${res.status}`}`)
      }

      const c = await res.json()
      const tierColor = TIER_COLORS[c.tier] ?? 0x5b6578
      const wrNum = parseFloat(c.winrate)
      const wrEmoji = wrNum >= 53 ? '🟢' : wrNum >= 50 ? '🟡' : '🔴'

      const countersText    = c.counters?.length    ? c.counters.join(', ')    : 'N/A'
      const strongText      = c.strongAgainst?.length ? c.strongAgainst.join(', ') : 'N/A'
      const changeText      = c.recentChange ? `⚡ ${c.recentChange}` : null

      const embed = new EmbedBuilder()
        .setColor(tierColor)
        .setTitle(`🗡️ ${c.champion}`)
        .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/14.12.1/img/champion/${c.champion}.png`)
        .addFields(
          { name: 'Tier',      value: c.tier,      inline: true },
          { name: `${wrEmoji} Win Rate`,  value: c.winrate,   inline: true },
          { name: '📌 Pick Rate', value: c.pickrate, inline: true },
          { name: '🚫 Ban Rate',  value: c.banrate,  inline: true },
        )

      if (c.counters?.length) {
        embed.addFields({ name: '❌ Le ganan', value: countersText, inline: false })
      }
      if (c.strongAgainst?.length) {
        embed.addFields({ name: '✅ Él les gana', value: strongText, inline: false })
      }
      if (changeText) {
        embed.addFields({ name: '📋 Cambio reciente', value: changeText, inline: false })
      }

      embed
        .setFooter({ text: `Fuente: LoLalytics · LoL Scout` })
        .setTimestamp()

      await interaction.editReply({ content: null, embeds: [embed] })
    } catch (err) {
      console.error('[champion]', err)
      await interaction.editReply('❌ Error al obtener stats del campeón.')
    }
  }
}

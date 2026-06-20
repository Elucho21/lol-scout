const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))

const API = process.env.LOL_API_URL || 'http://localhost:3001/api'

const TIER_COLORS = {
  CHALLENGER: 0xf4c874, GRANDMASTER: 0xe84057, MASTER: 0x9d48e0,
  DIAMOND: 0x6a8cff, EMERALD: 0x00c878, PLATINUM: 0x00b4a2,
  GOLD: 0xf0a742, SILVER: 0xa8b4c8, BRONZE: 0xcd7f32,
  IRON: 0x6b6b6b, UNRANKED: 0x5b6578,
}

const TIER_EMOJI = {
  CHALLENGER: '👑', GRANDMASTER: '🔴', MASTER: '💜',
  DIAMOND: '💎', EMERALD: '💚', PLATINUM: '🩵',
  GOLD: '🏅', SILVER: '⚪', BRONZE: '🟤', IRON: '⬛', UNRANKED: '❓',
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scout')
    .setDescription('Muestra las stats ranked de un invocador')
    .addStringOption(o =>
      o.setName('nombre').setDescription('Game Name (ej: Elucho21)').setRequired(true))
    .addStringOption(o =>
      o.setName('tag').setDescription('Tag del Riot ID (ej: LAS, NA1, KR1)').setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply()

    const nombre = interaction.options.getString('nombre')
    const tag    = interaction.options.getString('tag')

    try {
      const res = await fetch(`${API}/player/${encodeURIComponent(nombre)}/${encodeURIComponent(tag)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 404) {
          return interaction.editReply(`❌ No se encontró el jugador **${nombre}#${tag}**. Verificá el nombre y tag.`)
        }
        if (res.status === 429) {
          return interaction.editReply(`⏳ Rate limit de Riot API. Reintentá en ${body.retryAfter ?? 'unos'}s.`)
        }
        return interaction.editReply(`❌ Error: ${body.error ?? `HTTP ${res.status}`}`)
      }

      const p = await res.json()
      const tier   = p.tier ?? 'UNRANKED'
      const color  = TIER_COLORS[tier] ?? 0x5b6578
      const emoji  = TIER_EMOJI[tier] ?? '❓'
      const total  = p.wins + p.losses
      const winPct = total > 0 ? Math.round((p.wins / total) * 100) : 0
      const wBar   = total > 0 ? buildWinBar(winPct) : '—'

      const rankLine = tier === 'UNRANKED'
        ? 'Sin ranked esta temporada'
        : `${tier} ${p.rank} · **${p.lp} LP**`

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({
          name: `${p.gameName}#${p.tagLine}`,
          iconURL: `https://ddragon.leagueoflegends.com/cdn/14.12.1/img/profileicon/${p.profileIconId}.png`,
        })
        .setTitle(`${emoji} ${rankLine}`)
        .addFields(
          { name: '📊 Partidas', value: `${p.wins}V / ${p.losses}D (${total} total)`, inline: true },
          { name: '🎯 Win Rate', value: `**${winPct}%**`, inline: true },
          { name: '⭐ Nivel',    value: `${p.summonerLevel}`, inline: true },
          { name: '📈 Progreso', value: wBar, inline: false },
        )
        .setFooter({ text: `Plataforma: ${p.platform?.toUpperCase()} · LoL Scout` })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (err) {
      console.error('[scout]', err)
      await interaction.editReply('❌ No se pudo conectar con el servidor de LoL Scout.')
    }
  }
}

function buildWinBar(pct) {
  const filled = Math.round(pct / 10)
  const empty  = 10 - filled
  const bar = '🟩'.repeat(filled) + '⬛'.repeat(empty)
  return `${bar} ${pct}%`
}

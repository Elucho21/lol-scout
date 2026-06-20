import { useState } from 'react'

// ─── constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG = {
  CHALLENGER:  { color: '#f4c874', bg: '#1a1200', label: 'Challenger' },
  GRANDMASTER: { color: '#e84057', bg: '#1a0008', label: 'Grandmaster' },
  MASTER:      { color: '#9d48e0', bg: '#0e0018', label: 'Master' },
  DIAMOND:     { color: '#6a8cff', bg: '#00082a', label: 'Diamond' },
  EMERALD:     { color: '#00c878', bg: '#001a0e', label: 'Emerald' },
  PLATINUM:    { color: '#00b4a2', bg: '#001614', label: 'Platinum' },
  GOLD:        { color: '#f0a742', bg: '#1a0e00', label: 'Gold' },
  SILVER:      { color: '#a8b4c8', bg: '#0e1018', label: 'Silver' },
  BRONZE:      { color: '#cd7f32', bg: '#160a00', label: 'Bronze' },
  IRON:        { color: '#6b6b6b', bg: '#111', label: 'Iron' },
  UNRANKED:    { color: '#5b6578', bg: '#0e1018', label: 'Unranked' },
}

const TIER_ICONS = {
  CHALLENGER: '👑', GRANDMASTER: '🔴', MASTER: '💜',
  DIAMOND: '💎', EMERALD: '💚', PLATINUM: '🩵',
  GOLD: '🏅', SILVER: '⚪', BRONZE: '🟤', IRON: '⬛', UNRANKED: '❓',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path) {
  const res = await fetch(path)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    if (res.status === 429) throw new Error(`Rate limit – reintenta en ${body.retryAfter ?? '?'}s`)
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  return res.json()
}

function WinRateBar({ wins, losses }) {
  const total = wins + losses
  if (total === 0) return null
  const pct = Math.round((wins / total) * 100)
  const color = pct >= 55 ? '#00c878' : pct >= 50 ? '#f0a742' : '#e84057'
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#7a8fa6' }}>
        <span style={{ color: '#00c878' }}>{wins}V</span>
        <span style={{ color, fontWeight: 700, fontSize: 14 }}>{pct}%</span>
        <span style={{ color: '#e84057' }}>{losses}D</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: '#1a2a3a', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .5s ease' }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#5b6578', marginTop: 3 }}>{total} partidas</div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{
        display: 'inline-block', width: 32, height: 32,
        border: '3px solid #1a2a3a', borderTopColor: '#c89b3c',
        borderRadius: '50%', animation: 'spin 0.7s linear infinite'
      }} />
    </div>
  )
}

function Tag({ children, color = '#c89b3c' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 700, border: `1px solid ${color}`,
      color, letterSpacing: 1, textTransform: 'uppercase'
    }}>{children}</span>
  )
}

// ─── PlayerCard ───────────────────────────────────────────────────────────────

function PlayerCard({ data, onSearchMastery }) {
  const cfg = TIER_CONFIG[data.tier] ?? TIER_CONFIG.UNRANKED
  const icon = TIER_ICONS[data.tier] ?? '❓'
  const [champId, setChampId] = useState('')
  const [mastery, setMastery] = useState(null)
  const [loadingM, setLoadingM] = useState(false)
  const [errorM, setErrorM] = useState(null)

  async function fetchMastery(e) {
    e.preventDefault()
    if (!champId) return
    setLoadingM(true); setErrorM(null); setMastery(null)
    try {
      const m = await apiFetch(`/api/mastery/${data.puuid}/${champId}`)
      setMastery(m)
    } catch (err) { setErrorM(err.message) }
    finally { setLoadingM(false) }
  }

  return (
    <div style={{ ...S.card, borderColor: cfg.color + '55' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: `url(https://ddragon.leagueoflegends.com/cdn/14.12.1/img/profileicon/${data.profileIconId}.png) center/cover`,
          border: `2px solid ${cfg.color}`,
          flexShrink: 0
        }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#e8e0d0', fontFamily: 'Beaufort for LOL, serif' }}>
            {data.gameName}
            <span style={{ color: '#5b6578', fontWeight: 400, fontSize: 14 }}>#{data.tagLine}</span>
          </div>
          <div style={{ fontSize: 12, color: '#5b6578', marginTop: 2 }}>
            Nivel {data.summonerLevel} · {data.platform?.toUpperCase()}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 28 }}>{icon}</div>
          <div style={{ fontSize: 11, color: cfg.color, fontWeight: 700 }}>{cfg.label}</div>
        </div>
      </div>

      {/* Rank */}
      {data.tier !== 'UNRANKED' && (
        <div style={{
          background: cfg.bg, border: `1px solid ${cfg.color}33`,
          borderRadius: 8, padding: '12px 16px', marginBottom: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: cfg.color, fontWeight: 700, fontSize: 18 }}>
              {data.tier} {data.rank}
            </span>
            <span style={{ color: '#c89b3c', fontWeight: 700 }}>{data.lp} LP</span>
          </div>
          <WinRateBar wins={data.wins} losses={data.losses} />
        </div>
      )}
      {data.tier === 'UNRANKED' && (
        <div style={{ textAlign: 'center', padding: '12px', color: '#5b6578', fontSize: 14 }}>
          Sin partidas ranked esta temporada
        </div>
      )}

      {/* Mastery lookup */}
      <div style={{ marginTop: 12, borderTop: '1px solid #1a2a3a', paddingTop: 12 }}>
        <div style={{ fontSize: 12, color: '#5b6578', marginBottom: 8 }}>MAESTRÍA DE CAMPEÓN</div>
        <form onSubmit={fetchMastery} style={{ display: 'flex', gap: 8 }}>
          <input
            style={S.input} placeholder="Champion ID (ej: 157 = Yasuo)"
            value={champId} type="number"
            onChange={e => setChampId(e.target.value)}
          />
          <button style={S.btnSmall} disabled={loadingM}>
            {loadingM ? '…' : 'Ver'}
          </button>
        </form>
        {errorM && <p style={S.error}>{errorM}</p>}
        {mastery && (
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 13 }}>
            <span>Nivel <strong style={{ color: '#c89b3c' }}>{mastery.championLevel}</strong></span>
            <span>Puntos <strong style={{ color: '#e8e0d0' }}>{mastery.championPoints.toLocaleString()}</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ChampionCard ─────────────────────────────────────────────────────────────

function ChampionCard({ data }) {
  const tierColors = { 'S+': '#f4c874', S: '#f0a742', A: '#00c878', B: '#6a8cff', C: '#a8b4c8', D: '#e84057' }
  const tierColor = tierColors[data.tier] ?? '#5b6578'
  const wrNum = parseFloat(data.winrate)
  const wrColor = wrNum >= 53 ? '#00c878' : wrNum >= 50 ? '#f0a742' : '#e84057'

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/14.12.1/img/champion/${data.champion}.png`}
          alt={data.champion}
          style={{ width: 56, height: 56, borderRadius: 8, border: '2px solid #1a2a3a' }}
          onError={e => { e.target.style.display = 'none' }}
        />
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#e8e0d0', fontFamily: 'Beaufort for LOL, serif' }}>
            {data.champion}
          </div>
          <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Tag color={tierColor}>Tier {data.tier}</Tag>
            {data.recentChange && <Tag color='#f4c874'>{data.recentChange}</Tag>}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Win Rate', value: data.winrate, color: wrColor },
          { label: 'Pick Rate', value: data.pickrate, color: '#a9b4c5' },
          { label: 'Ban Rate', value: data.banrate, color: '#a9b4c5' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0a1628', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: 10, color: '#5b6578', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Counters */}
      {data.counters?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#e84057', fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>
            ▲ LE GANAN
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.counters.map(c => (
              <span key={c} style={{ background: '#1a0008', border: '1px solid #e8405733', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#e84057' }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
      {data.strongAgainst?.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: '#00c878', fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>
            ▼ ÉL LES GANA
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {data.strongAgainst.map(c => (
              <span key={c} style={{ background: '#001a0e', border: '1px solid #00c87833', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: '#00c878' }}>
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 10, color: '#2a3a4a' }}>
        Fuente: <a href={data.source} target="_blank" rel="noopener" style={{ color: '#2a4a6a' }}>LoLalytics</a>
      </div>
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState('player')

  // Player state
  const [gameName, setGameName] = useState('')
  const [tagLine, setTagLine] = useState('')
  const [player, setPlayer] = useState(null)
  const [loadingP, setLoadingP] = useState(false)
  const [errorP, setErrorP] = useState(null)

  // Champion state
  const [champName, setChampName] = useState('')
  const [champion, setChampion] = useState(null)
  const [loadingC, setLoadingC] = useState(false)
  const [errorC, setErrorC] = useState(null)

  async function fetchPlayer(e) {
    e.preventDefault()
    if (!gameName || !tagLine) return
    setLoadingP(true); setErrorP(null); setPlayer(null)
    try {
      const data = await apiFetch(`/api/player/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`)
      setPlayer(data)
    } catch (err) { setErrorP(err.message) }
    finally { setLoadingP(false) }
  }

  async function fetchChampion(e) {
    e.preventDefault()
    if (!champName) return
    setLoadingC(true); setErrorC(null); setChampion(null)
    try {
      const data = await apiFetch(`/api/champion/${encodeURIComponent(champName)}`)
      setChampion(data)
    } catch (err) { setErrorC(err.message) }
    finally { setLoadingC(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#010a13' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        input::placeholder { color: #3a4a5a }
        input:focus { outline: none; border-color: #c89b3c !important; }
        button:hover:not(:disabled) { opacity: 0.85; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #010a13; }
        ::-webkit-scrollbar-thumb { background: #1a2a3a; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, #091428 0%, #010a13 100%)',
        borderBottom: '1px solid #c89b3c44',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚔️</span>
            <span style={{ fontFamily: 'Beaufort for LOL, serif', fontSize: 20, fontWeight: 700, color: '#c89b3c', letterSpacing: 2 }}>
              LOL SCOUT
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['player', 'champion'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: tab === t ? '#c89b3c22' : 'transparent',
                  border: `1px solid ${tab === t ? '#c89b3c' : '#1a2a3a'}`,
                  color: tab === t ? '#c89b3c' : '#5b6578',
                  padding: '6px 18px', borderRadius: 6, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, letterSpacing: 1,
                  textTransform: 'uppercase', transition: 'all .2s'
                }}
              >
                {t === 'player' ? '🎮 Jugador' : '🗡️ Campeón'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 16px' }}>

        {/* ── PLAYER TAB ── */}
        {tab === 'player' && (
          <div style={{ animation: 'fadeIn .3s ease' }}>
            <h2 style={S.sectionTitle}>Buscar Invocador</h2>
            <form onSubmit={fetchPlayer} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              <input
                style={{ ...S.input, flex: 2, minWidth: 160 }}
                placeholder="Game Name (ej: Elucho21)"
                value={gameName}
                onChange={e => setGameName(e.target.value)}
              />
              <div style={{ display: 'flex', alignItems: 'center', color: '#3a4a5a', fontSize: 18, userSelect: 'none' }}>#</div>
              <input
                style={{ ...S.input, width: 100 }}
                placeholder="LAS"
                value={tagLine}
                onChange={e => setTagLine(e.target.value)}
              />
              <button style={S.btn} disabled={loadingP}>
                {loadingP ? 'Buscando…' : 'Buscar'}
              </button>
            </form>
            {loadingP && <Spinner />}
            {errorP && <div style={S.errorBox}>⚠️ {errorP}</div>}
            {player && <div style={{ animation: 'fadeIn .3s ease' }}><PlayerCard data={player} /></div>}
          </div>
        )}

        {/* ── CHAMPION TAB ── */}
        {tab === 'champion' && (
          <div style={{ animation: 'fadeIn .3s ease' }}>
            <h2 style={S.sectionTitle}>Analizar Campeón</h2>
            <form onSubmit={fetchChampion} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              <input
                style={{ ...S.input, flex: 1 }}
                placeholder="Nombre del campeón (ej: Yasuo, Jinx, Ahri)"
                value={champName}
                onChange={e => setChampName(e.target.value)}
              />
              <button style={S.btn} disabled={loadingC}>
                {loadingC ? 'Analizando…' : 'Analizar'}
              </button>
            </form>
            {loadingC && (
              <div>
                <Spinner />
                <p style={{ textAlign: 'center', fontSize: 12, color: '#3a4a5a', marginTop: -8 }}>
                  Renderizando LoLalytics… puede tardar ~10s
                </p>
              </div>
            )}
            {errorC && <div style={S.errorBox}>⚠️ {errorC}</div>}
            {champion && <div style={{ animation: 'fadeIn .3s ease' }}><ChampionCard data={champion} /></div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── shared styles ────────────────────────────────────────────────────────────
const S = {
  card: {
    background: '#0a1628',
    border: '1px solid #1a2a3a',
    borderRadius: 12,
    padding: '20px 22px',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Beaufort for LOL, serif',
    color: '#c89b3c',
    fontSize: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  input: {
    background: '#0a1628',
    border: '1px solid #1a2a3a',
    borderRadius: 8,
    color: '#c8d8e8',
    padding: '10px 14px',
    fontSize: 14,
    transition: 'border-color .2s',
  },
  btn: {
    background: 'linear-gradient(180deg, #c89b3c 0%, #a07830 100%)',
    color: '#010a13',
    border: 'none',
    borderRadius: 8,
    padding: '10px 22px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 13,
    letterSpacing: 1,
    fontFamily: 'Beaufort for LOL, serif',
    whiteSpace: 'nowrap',
  },
  btnSmall: {
    background: '#c89b3c',
    color: '#010a13',
    border: 'none',
    borderRadius: 6,
    padding: '8px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 12,
  },
  error: { color: '#e84057', fontSize: 13, marginTop: 6 },
  errorBox: {
    background: '#1a0008',
    border: '1px solid #e8405744',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#e84057',
    fontSize: 13,
  },
}

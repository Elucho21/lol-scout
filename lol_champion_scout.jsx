import { useState } from "react";

const API = "http://localhost:3001/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      throw new Error(`Rate limit – reintenta en ${body.retryAfter ?? "?"}s`);
    }
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const TIER_COLOR = {
  IRON: "#6b6b6b",
  BRONZE: "#a0522d",
  SILVER: "#a8a9ad",
  GOLD: "#ffd700",
  PLATINUM: "#00b4a2",
  EMERALD: "#00c878",
  DIAMOND: "#6a8cff",
  MASTER: "#9d48e0",
  GRANDMASTER: "#e84057",
  CHALLENGER: "#f4c874",
  UNRANKED: "#999",
};

// ─── component ────────────────────────────────────────────────────────────────

export default function LolChampionScout() {
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [championName, setChampionName] = useState("");
  const [championId, setChampionId] = useState("");

  const [player, setPlayer] = useState(null);
  const [mastery, setMastery] = useState(null);
  const [champion, setChampion] = useState(null);

  const [loadingPlayer, setLoadingPlayer] = useState(false);
  const [loadingMastery, setLoadingMastery] = useState(false);
  const [loadingChampion, setLoadingChampion] = useState(false);

  const [errorPlayer, setErrorPlayer] = useState(null);
  const [errorMastery, setErrorMastery] = useState(null);
  const [errorChampion, setErrorChampion] = useState(null);

  // ── player lookup ───────────────────────────────────────────────────────────
  async function fetchPlayer(e) {
    e.preventDefault();
    if (!gameName || !tagLine) return;
    setLoadingPlayer(true);
    setErrorPlayer(null);
    setPlayer(null);
    setMastery(null);
    try {
      const data = await apiFetch(`/player/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
      setPlayer(data);
    } catch (err) {
      setErrorPlayer(err.message);
    } finally {
      setLoadingPlayer(false);
    }
  }

  // ── mastery lookup ──────────────────────────────────────────────────────────
  async function fetchMastery(e) {
    e.preventDefault();
    if (!player?.puuid || !championId) return;
    setLoadingMastery(true);
    setErrorMastery(null);
    setMastery(null);
    try {
      const data = await apiFetch(`/mastery/${player.puuid}/${championId}`);
      setMastery(data);
    } catch (err) {
      setErrorMastery(err.message);
    } finally {
      setLoadingMastery(false);
    }
  }

  // ── champion stats ──────────────────────────────────────────────────────────
  async function fetchChampion(e) {
    e.preventDefault();
    if (!championName) return;
    setLoadingChampion(true);
    setErrorChampion(null);
    setChampion(null);
    try {
      const data = await apiFetch(`/champion/${encodeURIComponent(championName)}`);
      setChampion(data);
    } catch (err) {
      setErrorChampion(err.message);
    } finally {
      setLoadingChampion(false);
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>
      <h1 style={styles.title}>⚔️ LoL Champion Scout</h1>

      {/* ── PLAYER SECTION ── */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Buscar Jugador</h2>
        <form onSubmit={fetchPlayer} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Game Name (ej: Faker)"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
          />
          <input
            style={{ ...styles.input, width: 80 }}
            placeholder="Tag (ej: KR1)"
            value={tagLine}
            onChange={(e) => setTagLine(e.target.value)}
          />
          <button style={styles.btn} disabled={loadingPlayer}>
            {loadingPlayer ? "Buscando…" : "Buscar"}
          </button>
        </form>
        {errorPlayer && <p style={styles.error}>{errorPlayer}</p>}
        {player && (
          <div style={styles.result}>
            <p>
              <strong>{player.gameName}#{player.tagLine}</strong>
            </p>
            <p>
              <span style={{ color: TIER_COLOR[player.tier] || "#fff", fontWeight: "bold" }}>
                {player.tier} {player.rank}
              </span>{" "}
              · {player.lp} LP · {player.wins}W {player.losses}L
            </p>
            <p style={{ fontSize: 11, color: "#666" }}>PUUID: {player.puuid.slice(0, 20)}…</p>
          </div>
        )}
      </section>

      {/* ── MASTERY SECTION ── */}
      {player && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Maestría de Campeón</h2>
          <form onSubmit={fetchMastery} style={styles.form}>
            <input
              style={{ ...styles.input, width: 120 }}
              placeholder="Champion ID (ej: 157)"
              value={championId}
              onChange={(e) => setChampionId(e.target.value)}
              type="number"
            />
            <button style={styles.btn} disabled={loadingMastery}>
              {loadingMastery ? "Cargando…" : "Ver Maestría"}
            </button>
          </form>
          {errorMastery && <p style={styles.error}>{errorMastery}</p>}
          {mastery && (
            <div style={styles.result}>
              <p>Nivel de maestría: <strong>{mastery.championLevel}</strong></p>
              <p>Puntos: <strong>{mastery.championPoints.toLocaleString()}</strong></p>
            </div>
          )}
        </section>
      )}

      {/* ── CHAMPION SECTION ── */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Stats del Campeón (LoLalytics)</h2>
        <form onSubmit={fetchChampion} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Champion (ej: Yasuo)"
            value={championName}
            onChange={(e) => setChampionName(e.target.value)}
          />
          <button style={styles.btn} disabled={loadingChampion}>
            {loadingChampion ? "Cargando…" : "Analizar"}
          </button>
        </form>
        {errorChampion && <p style={styles.error}>{errorChampion}</p>}
        {champion && (
          <div style={styles.result}>
            <p>
              Tier:{" "}
              <strong style={{ color: champion.tier === "S+" ? "#ffd700" : "#fff" }}>
                {champion.tier}
              </strong>
            </p>
            <p>Win Rate: <strong>{champion.winrate}</strong></p>
            <p>Pick Rate: <strong>{champion.pickrate}</strong></p>
            <p>Ban Rate: <strong>{champion.banrate}</strong></p>
            {champion.recentChange && (
              <p style={{ color: "#f4a261" }}>
                ⚡ {champion.recentChange}
              </p>
            )}
            {champion.counters.length > 0 && (
              <p>Counters: {champion.counters.join(", ")}</p>
            )}
            {champion.strongAgainst.length > 0 && (
              <p>Strong vs: {champion.strongAgainst.join(", ")}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    maxWidth: 560,
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "'Segoe UI', sans-serif",
    color: "#e8e8e8",
    background: "#0e0e1a",
    minHeight: "100vh",
  },
  title: {
    textAlign: "center",
    color: "#c89b3c",
    marginBottom: 24,
  },
  card: {
    background: "#1a1a2e",
    borderRadius: 10,
    padding: "20px 24px",
    marginBottom: 20,
    border: "1px solid #2a2a4a",
  },
  cardTitle: {
    margin: "0 0 14px",
    fontSize: 16,
    color: "#a0aec0",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  form: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  input: {
    background: "#0e0e1a",
    border: "1px solid #3a3a5a",
    borderRadius: 6,
    color: "#e8e8e8",
    padding: "8px 10px",
    fontSize: 14,
    flex: 1,
    minWidth: 100,
  },
  btn: {
    background: "#c89b3c",
    color: "#0e0e1a",
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 14,
  },
  result: {
    marginTop: 14,
    padding: "12px 16px",
    background: "#0e0e1a",
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 1.8,
  },
  error: {
    color: "#fc8181",
    marginTop: 8,
    fontSize: 13,
  },
};

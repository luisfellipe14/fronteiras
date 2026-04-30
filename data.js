// Mock data baseado nos CSVs reais (limites.csv e points.csv)
// Para o redesign: dados sintéticos plausíveis com a estrutura correta.

window.POINTS = [
  { point: "BP Terciario", lat: -16.49, lon: -52.61 },
  { point: "Barra do Peixe", lat: -16.49, lon: -52.61 },
  { point: "Brasnorte", lat: -12.87, lon: -58.06 },
  { point: "Canarana", lat: -13.52, lon: -52.29 },
  { point: "Couto Magalhaes", lat: -17.11, lon: -53.13 },
  { point: "Coxipo", lat: -15.62, lon: -55.99 },
  { point: "Dardanelos", lat: -10.15, lon: -59.44 },
  { point: "Jaciara", lat: -15.97, lon: -54.96 },
  { point: "Jauru", lat: -15.30, lon: -58.83 },
  { point: "Juba", lat: -14.83, lon: -57.91 },
  { point: "Juina", lat: -11.29, lon: -58.74 },
  { point: "Lucas do Rio Verde", lat: -13.01, lon: -55.93 },
  { point: "Nobres", lat: -14.72, lon: -56.29 },
  { point: "Nova Mutum", lat: -13.82, lon: -56.07 },
  { point: "Paranaita", lat: -10.35, lon: -56.84 },
  { point: "Petrovina", lat: -16.79, lon: -54.03 },
  { point: "Rondonopolis", lat: -16.47, lon: -54.59 },
  { point: "Santana do Araguaia", lat: -10.32, lon: -50.39 },
  { point: "Sinop", lat: -11.98, lon: -55.52 },
  { point: "Sorriso", lat: -12.57, lon: -55.76 },
  { point: "Varzea Grande", lat: -15.71, lon: -56.18 },
];

// limites do limites.csv original
window.LIMITS = {
  "BP Terciario":        { Pmax: 4.1,   Pmin: -1.8,   Qmax: 1.7,    Qmin: 1.5,   MUSTP: 4,    MUSTFP: 4,   Instalado: 10 },
  "Barra do Peixe":      { Pmax: 130.6, Pmin: -41.5,  Qmax: -18,    Qmin: -31.1, MUSTP: 130,  MUSTFP: 144, Instalado: 250 },
  "Brasnorte":           { Pmax: 64.1,  Pmin: -98.1,  Qmax: -9.1,   Qmin: -6.4,  MUSTP: 40,   MUSTFP: 60,  Instalado: 100 },
  "Canarana":            { Pmax: 93.7,  Pmin: -29.3,  Qmax: -7.9,   Qmin: -3,    MUSTP: 95,   MUSTFP: 100, Instalado: 120 },
  "Couto Magalhaes":     { Pmax: 25.1,  Pmin: -18.8,  Qmax: 3.3,    Qmin: 5,     MUSTP: 28,   MUSTFP: 28,  Instalado: 28 },
  "Coxipo":              { Pmax: 614.8, Pmin: -138.4, Qmax: 231.4,  Qmin: 40.1,  MUSTP: 576,  MUSTFP: 630, Instalado: 650 },
  "Dardanelos":          { Pmax: 21.5,  Pmin: -34.2,  Qmax: -2.3,   Qmin: -3.4,  MUSTP: 20.5, MUSTFP: 21,  Instalado: 62.5 },
  "Jaciara":             { Pmax: 19.4,  Pmin: -26.8,  Qmax: 7.7,    Qmin: 8,     MUSTP: 16,   MUSTFP: 18,  Instalado: 37.5 },
  "Jauru":               { Pmax: -2.9,  Pmin: -279.1, Qmax: 12.3,   Qmin: 70.5,  MUSTP: 0,    MUSTFP: 0,   Instalado: 600 },
  "Juba":                { Pmax: 39.2,  Pmin: -114.4, Qmax: 8.7,    Qmin: -6.5,  MUSTP: 30,   MUSTFP: 50,  Instalado: 300 },
  "Juina":               { Pmax: 43.6,  Pmin: -19.6,  Qmax: 3.6,    Qmin: 1.5,   MUSTP: 48,   MUSTFP: 59,  Instalado: 100 },
  "Lucas do Rio Verde":  { Pmax: 92.4,  Pmin: -49,    Qmax: 28.9,   Qmin: 0.8,   MUSTP: 95,   MUSTFP: 120, Instalado: 150 },
  "Nobres":              { Pmax: 139.3, Pmin: -58.7,  Qmax: 14.8,   Qmin: -15.3, MUSTP: 115,  MUSTFP: 145, Instalado: 200 },
  "Nova Mutum":          { Pmax: 89.8,  Pmin: -82.4,  Qmax: 29.8,   Qmin: -1.4,  MUSTP: 68,   MUSTFP: 92,  Instalado: 93 },
  "Paranaita":           { Pmax: 113.3, Pmin: -91.3,  Qmax: 20.5,   Qmin: 15.7,  MUSTP: 90,   MUSTFP: 115, Instalado: 150 },
  "Petrovina":           { Pmax: 16.9,  Pmin: -0.9,   Qmax: 7.2,    Qmin: 0.4,   MUSTP: 15,   MUSTFP: 20,  Instalado: 25 },
  "Rondonopolis":        { Pmax: 314.9, Pmin: -51.8,  Qmax: 104.6,  Qmin: 22.4,  MUSTP: 280,  MUSTFP: 340, Instalado: 400 },
  "Santana do Araguaia": { Pmax: 101.9, Pmin: -10.6,  Qmax: 8.3,    Qmin: -12.6, MUSTP: 105,  MUSTFP: 105, Instalado: 300 },
  "Sinop":               { Pmax: 293.6, Pmin: -153.1, Qmax: 8,      Qmin: 3.2,   MUSTP: 270,  MUSTFP: 292, Instalado: 300 },
  "Sorriso":             { Pmax: 88.3,  Pmin: -45.1,  Qmax: 16.2,   Qmin: 6,     MUSTP: 75,   MUSTFP: 86,  Instalado: 90 },
  "Varzea Grande":       { Pmax: 265.2, Pmin: 25.4,   Qmax: 14.8,   Qmin: -19.8, MUSTP: 265,  MUSTFP: 280, Instalado: 300 },
};

// Calcula Smax/Smin a partir de P/Q quando aplicável
(function computeS() {
  Object.keys(window.LIMITS).forEach(k => {
    const l = window.LIMITS[k];
    if (l.Pmax != null && l.Qmax != null) {
      l.Smax = Math.sqrt(l.Pmax * l.Pmax + l.Qmax * l.Qmax);
    }
    if (l.Pmin != null && l.Qmin != null) {
      const v = Math.sqrt(l.Pmin * l.Pmin + l.Qmin * l.Qmin);
      l.Smin = l.Pmin < 0 ? -v : v;
    }
  });
})();

// "Verificado" sintético: pico observado para cálculo do % de carregamento (MVA)
// usa um fator entre 0.45 e 0.99 do Instalado para variar e ser realista
window.VERIFICADO = (() => {
  const seedRand = (seed) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };
  const rand = seedRand(42);
  const out = {};
  Object.keys(window.LIMITS).forEach(k => {
    const inst = window.LIMITS[k].Instalado;
    if (inst == null) { out[k] = null; return; }
    // alguns pontos com carregamento alto, outros médio, outros baixo
    let pct;
    if (k === "Coxipo") pct = 0.94;
    else if (k === "Sinop") pct = 0.97;
    else if (k === "Petrovina") pct = 0.91;
    else if (k === "Sorriso") pct = 0.95;
    else if (k === "Varzea Grande") pct = 0.88;
    else if (k === "Jauru") pct = 0.46;
    else if (k === "BP Terciario") pct = 0.41;
    else pct = 0.55 + rand() * 0.35;
    out[k] = inst * pct;
  });
  return out;
})();

// Soma total (apenas Instalado)
window.TOTAL_INSTALADO = Object.values(window.LIMITS).reduce((a, b) => a + (b.Instalado || 0), 0);
window.TOTAL_VERIFICADO = Object.values(window.VERIFICADO).reduce((a, b) => a + (b || 0), 0);

// Gera série temporal sintética para um ponto / dia (96 pontos = 15 min)
window.genSeries = function(pointName, dateStr, tipo) {
  const lim = window.LIMITS[pointName] || {};
  const ref = tipo === "P"
    ? (lim.Pmax || lim.Smax || 100)
    : (lim.Smax || lim.Pmax || 100);
  const refMin = tipo === "P"
    ? (lim.Pmin || -ref * 0.2)
    : (lim.Smin || -ref * 0.2);

  // semente baseada no nome+data
  let seed = 0;
  for (let i = 0; i < pointName.length; i++) seed += pointName.charCodeAt(i);
  for (let i = 0; i < dateStr.length; i++) seed += dateStr.charCodeAt(i) * 13;
  const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  const N = 96;
  const out = [];
  const labels = [];
  for (let i = 0; i < N; i++) {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    labels.push(String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"));

    // perfil de carga: vale madrugada, pico noturno, ponta 18:30-21:30
    const t = i / N;
    const morning = 0.45 + 0.18 * Math.sin(2 * Math.PI * (t - 0.05));
    const evening = (i >= 74 && i <= 86) ? 0.28 : 0;
    const noise = (rand() - 0.5) * 0.08;
    let factor = morning + evening + noise;
    if (factor < 0.05) factor = 0.05;
    const v = ref * factor;
    out.push(+v.toFixed(3));
  }
  return { labels, values: out, ref, refMin, MUSTP: lim.MUSTP, MUSTFP: lim.MUSTFP };
};

// Datas disponíveis (últimos 60 dias)
window.AVAILABLE_DATES = (() => {
  const out = [];
  const end = new Date("2026-04-30");
  for (let i = 59; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
})();

// MUST exceedances mock
window.MUST_EXCEED = (() => {
  const out = {};
  const points = Object.keys(window.LIMITS);
  points.forEach(p => {
    const lim = window.LIMITS[p];
    if (!lim.MUSTP) { out[p] = []; return; }
    let seed = 0;
    for (let i = 0; i < p.length; i++) seed += p.charCodeAt(i) * 7;
    const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const count = Math.floor(rand() * 8);
    const events = [];
    for (let i = 0; i < count; i++) {
      const day = window.AVAILABLE_DATES[Math.floor(rand() * window.AVAILABLE_DATES.length)];
      const isPonta = rand() > 0.5;
      const thr = isPonta ? lim.MUSTP : lim.MUSTFP;
      const exceed = thr * (1.02 + rand() * 0.12);
      const h = isPonta ? 18 + Math.floor(rand() * 4) : Math.floor(rand() * 24);
      const mm = [0, 15, 30, 45][Math.floor(rand() * 4)];
      events.push({
        ts: `${day} ${String(h).padStart(2,"0")}:${String(mm).padStart(2,"0")}`,
        value_mw: +exceed.toFixed(2),
        type: isPonta ? "MUSTP" : "MUSTFP",
        threshold: thr,
      });
    }
    out[p] = events.sort((a,b) => b.ts.localeCompare(a.ts));
  });
  // Soma Total
  out["Soma Total"] = [];
  return out;
})();

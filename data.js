// data.js — Async loader. Tries to fetch data/*.json (produced by
// scripts/preprocess.py); falls back to mocked data if those files are missing
// (e.g. on a fresh repo without a `data-latest` release uploaded yet).
//
// Whether real or mock, the exposed shape is the same:
//   window.POINTS, window.LIMITS, window.AVAILABLE_DATES,
//   window.VERIFICADO, window.TOTAL_INSTALADO, window.TOTAL_VERIFICADO,
//   window.ACOMPANHAMENTO, window.MUST_EXCEED, window.EXTREMOS_TOP, window.RAO_DATA,
//   window.loadDay(dateIso) -> Promise<{labels, points: {[p]: {P, Q, S}}}>
//   window.USING_REAL_DATA (boolean), window.DATA_GENERATED_AT (string|null)

(() => {
  const ROUND_PCT = (n) => (n == null ? null : Math.round(n * 100) / 100);

  const MOCK_POINTS = [
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

  const MOCK_LIMITS = {
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

  function deriveSFromPQ(limits) {
    Object.values(limits).forEach((l) => {
      if (l.Pmax != null && l.Qmax != null && l.Smax == null) {
        l.Smax = Math.sqrt(l.Pmax * l.Pmax + l.Qmax * l.Qmax);
      }
      if (l.Pmin != null && l.Qmin != null && l.Smin == null) {
        const v = Math.sqrt(l.Pmin * l.Pmin + l.Qmin * l.Qmin);
        l.Smin = l.Pmin < 0 ? -v : v;
      }
    });
  }

  function seedRand(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function buildMockVerificado(limits) {
    const rand = seedRand(42);
    const out = {};
    Object.keys(limits).forEach((k) => {
      const inst = limits[k].Instalado;
      if (inst == null) { out[k] = null; return; }
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
  }

  function genMockDay(dateIso, points, limits) {
    const N = 96;
    const labels = [];
    for (let i = 0; i < N; i++) {
      const h = Math.floor(i / 4);
      const m = (i % 4) * 15;
      labels.push(String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"));
    }
    const dayPoints = {};
    points.forEach((p) => {
      const lim = limits[p.point] || {};
      let seed = 0;
      for (let i = 0; i < p.point.length; i++) seed += p.point.charCodeAt(i);
      for (let i = 0; i < dateIso.length; i++) seed += dateIso.charCodeAt(i) * 13;
      const rand = seedRand(seed);
      const refP = lim.Pmax || lim.Smax || 100;
      const P = []; const Q = []; const S = [];
      for (let i = 0; i < N; i++) {
        const t = i / N;
        const morning = 0.45 + 0.18 * Math.sin(2 * Math.PI * (t - 0.05));
        const evening = (i >= 74 && i <= 86) ? 0.28 : 0;
        const noise = (rand() - 0.5) * 0.08;
        let factor = morning + evening + noise;
        if (factor < 0.05) factor = 0.05;
        const pVal = refP * factor;
        const qVal = pVal * (0.15 + (rand() - 0.5) * 0.05);
        const sVal = Math.sign(pVal) * Math.sqrt(pVal * pVal + qVal * qVal);
        P.push(+pVal.toFixed(3));
        Q.push(+qVal.toFixed(3));
        S.push(+sVal.toFixed(3));
      }
      dayPoints[p.point] = { P, Q, S };
    });
    return { date: dateIso, labels, points: dayPoints };
  }

  function buildMockMust(limits, dates) {
    const out = {};
    Object.keys(limits).forEach((p) => {
      const lim = limits[p];
      if (!lim.MUSTP) { out[p] = []; return; }
      let seed = 0;
      for (let i = 0; i < p.length; i++) seed += p.charCodeAt(i) * 7;
      const rand = seedRand(seed);
      const count = Math.floor(rand() * 8);
      const events = [];
      for (let i = 0; i < count; i++) {
        const day = dates[Math.floor(rand() * dates.length)];
        const isPonta = rand() > 0.5;
        const thr = isPonta ? lim.MUSTP : lim.MUSTFP;
        const exceed = thr * (1.02 + rand() * 0.12);
        const h = isPonta ? 18 + Math.floor(rand() * 4) : Math.floor(rand() * 24);
        const mm = [0, 15, 30, 45][Math.floor(rand() * 4)];
        events.push({
          ts: `${day} ${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
          value_mw: +exceed.toFixed(2),
          type: isPonta ? "MUSTP" : "MUSTFP",
          threshold: thr,
        });
      }
      out[p] = events.sort((a, b) => b.ts.localeCompare(a.ts));
    });
    out["Soma Total"] = [];
    return out;
  }

  function buildMockExtremos(limits, dates) {
    const out = {};
    const N = 20;
    Object.keys(limits).forEach((p) => {
      const lim = limits[p];
      let seed = p.length * 31;
      const rand = seedRand(seed);
      const top = (max, largest) => {
        const arr = [];
        for (let i = 0; i < N; i++) {
          const day = dates[Math.floor(rand() * dates.length)];
          const h = Math.floor(rand() * 24);
          const mm = [0, 15, 30, 45][Math.floor(rand() * 4)];
          const ts = `${day} ${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
          const value = max * (0.92 + rand() * 0.08 - i * 0.005);
          arr.push({ value: +value.toFixed(3), ts, year: +day.slice(0, 4) });
        }
        return arr.sort((a, b) => largest ? b.value - a.value : a.value - b.value);
      };
      out[p] = {
        Pmax_top: top(lim.Pmax || 100, true),
        Pmin_top: top(lim.Pmin || -20, false),
        Smax_top: top(lim.Smax || lim.Pmax || 100, true),
        Smin_top: top(lim.Smin || -20, false),
      };
    });
    const sumPmax = Object.values(limits).reduce((a, l) => a + (l.Pmax || 0), 0);
    const sumPmin = Object.values(limits).reduce((a, l) => a + (l.Pmin || 0), 0);
    const sumSmax = Object.values(limits).reduce((a, l) => a + (l.Smax || 0), 0);
    const rand = seedRand(17);
    const top = (max, largest) => {
      const arr = [];
      for (let i = 0; i < N; i++) {
        const day = dates[Math.floor(rand() * dates.length)];
        const h = Math.floor(rand() * 24);
        const mm = [0, 15, 30, 45][Math.floor(rand() * 4)];
        const ts = `${day} ${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
        const value = max * (0.95 - i * 0.01);
        arr.push({ value: +value.toFixed(3), ts, year: +day.slice(0, 4) });
      }
      return largest ? arr : arr.map(x => ({ ...x, value: -Math.abs(x.value) }));
    };
    out["Soma Total"] = {
      Pmax_top: top(sumPmax, true),
      Pmin_top: top(sumPmin, false),
      Smax_top: top(sumSmax, true),
      Smin_top: top(-Math.abs(sumPmin) * 1.1, false),
    };
    return out;
  }

  function buildMockRao(pontos) {
    const out = {};
    [2024, 2025, 2026].forEach((year) => {
      ["may_oct", "nov_apr"].forEach((sem) => {
        let s = year * 1000 + (sem === "may_oct" ? 1 : 2);
        const rand = seedRand(s);
        const rows = pontos.map((p) => {
          const total = 4000 + Math.floor(rand() * 400);
          const validas = Math.floor(total * (0.85 + rand() * 0.13));
          const inv = total - validas;
          const dentro = Math.floor(validas * (0.78 + rand() * 0.18));
          return {
            ponto: p, total, validas, invalidas: inv,
            reverso: Math.floor(rand() * 50),
            desligado: inv - Math.floor(rand() * 50),
            dentro_count: dentro,
            dentro_pct: +((dentro / total) * 100).toFixed(2),
            fora_count: total - dentro,
            fora_pct: +(((total - dentro) / total) * 100).toFixed(2),
            ind: Math.floor(validas * (0.7 + rand() * 0.2)),
            cap: validas - Math.floor(validas * (0.7 + rand() * 0.2)),
          };
        });
        const totais = rows.reduce((acc, r) => ({
          total: acc.total + r.total,
          validas: acc.validas + r.validas,
          invalidas: acc.invalidas + r.invalidas,
          indutivo: acc.indutivo + r.ind,
          capacitivo: acc.capacitivo + r.cap,
        }), { total: 0, validas: 0, invalidas: 0, indutivo: 0, capacitivo: 0 });
        out[`${year}_${sem}`] = { rows, totais, year, semester: sem };
      });
    });
    return out;
  }

  function buildMockDates() {
    const out = [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    for (let i = 59; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  function setupMock() {
    const limits = JSON.parse(JSON.stringify(MOCK_LIMITS));
    deriveSFromPQ(limits);
    const dates = buildMockDates();
    const verificado = buildMockVerificado(limits);
    const acomp = Object.keys(limits).map((p) => {
      const inst = limits[p].Instalado;
      const v = verificado[p];
      const pct = (v != null && inst) ? ROUND_PCT((Math.abs(v) / inst) * 100) : null;
      return {
        ponto: p, instalado: inst,
        verificado_value: v != null ? +v.toFixed(3) : null,
        verificado_sign: v != null && v < 0 ? "min" : "max",
        percentual: pct,
      };
    });
    const totalI = Object.values(limits).reduce((a, b) => a + (b.Instalado || 0), 0);
    const totalV = Object.values(verificado).reduce((a, b) => a + (b || 0), 0);

    window.POINTS = MOCK_POINTS;
    window.LIMITS = limits;
    window.AVAILABLE_DATES = dates;
    window.VERIFICADO = verificado;
    window.ACOMPANHAMENTO = acomp;
    window.TOTAL_INSTALADO = totalI;
    window.TOTAL_VERIFICADO = totalV;
    window.MUST_EXCEED = buildMockMust(limits, dates);
    window.EXTREMOS_TOP = buildMockExtremos(limits, dates);
    window.RAO_DATA = buildMockRao(Object.keys(limits));
    window.USING_REAL_DATA = false;
    window.DATA_GENERATED_AT = null;

    const dayCache = {};
    window.loadDay = (dateIso) => {
      if (!dayCache[dateIso]) {
        dayCache[dateIso] = Promise.resolve(genMockDay(dateIso, MOCK_POINTS, limits));
      }
      return dayCache[dateIso];
    };
  }

  async function setupReal(meta) {
    const [must, extremos, rao] = await Promise.all([
      fetch("data/must.json").then((r) => r.ok ? r.json() : {}),
      fetch("data/extremos.json").then((r) => r.ok ? r.json() : {}),
      fetch("data/rao.json").then((r) => r.ok ? r.json() : {}),
    ]);

    const limits = meta.limits || {};
    deriveSFromPQ(limits);

    const verificado = {};
    (meta.acompanhamento || []).forEach((r) => {
      verificado[r.ponto] = r.verificado_value;
    });

    window.POINTS = meta.points || [];
    window.LIMITS = limits;
    window.AVAILABLE_DATES = meta.dates || [];
    window.VERIFICADO = verificado;
    window.ACOMPANHAMENTO = meta.acompanhamento || [];
    window.TOTAL_INSTALADO = (meta.totals && meta.totals.instalado) || 0;
    window.TOTAL_VERIFICADO = (meta.totals && meta.totals.verificado) || 0;
    window.MUST_EXCEED = must;
    window.EXTREMOS_TOP = extremos;
    window.RAO_DATA = rao;
    window.USING_REAL_DATA = true;
    window.DATA_GENERATED_AT = meta.generated_at || null;

    const dayCache = {};
    window.loadDay = (dateIso) => {
      if (!dayCache[dateIso]) {
        dayCache[dateIso] = fetch(`data/series/${dateIso}.json`)
          .then((r) => {
            if (!r.ok) throw new Error("missing series for " + dateIso);
            return r.json();
          })
          .catch(() => ({ date: dateIso, labels: [], points: {} }));
      }
      return dayCache[dateIso];
    };
  }

  window.__dataReady = (async () => {
    try {
      const r = await fetch("data/meta.json", { cache: "no-cache" });
      if (!r.ok) throw new Error("meta.json " + r.status);
      const meta = await r.json();
      await setupReal(meta);
      console.info("[data] loaded real dataset · generated " + window.DATA_GENERATED_AT);
    } catch (err) {
      console.warn("[data] real dataset unavailable — using mock:", err.message);
      setupMock();
    }
  })();
})();

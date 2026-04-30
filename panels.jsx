// panels.jsx — Painéis: Acompanhamento, MUST, RAO, Extremos, Balanço
const { useState: useS, useMemo: useM } = React;

// ---------- Helpers ----------
function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function pctClass(p) {
  if (p == null) return "";
  if (p < 70) return "lo";
  if (p < 90) return "md";
  return "hi";
}
function PctBar({ p }) {
  const c = pctClass(p);
  const w = Math.min(100, Math.max(0, p || 0));
  return (
    <div className="bar-wrap">
      <div className="bar-track"><div className={"bar-fill " + c} style={{ width: w + "%" }} /></div>
      <div className="bar-pct">{p == null ? "—" : p.toFixed(1) + "%"}</div>
    </div>
  );
}

// ---------- Acompanhamento (foco: % carregamento) ----------
function AcompanhamentoTable({ onPick, picked }) {
  const [sortKey, setSortKey] = useS("pct");
  const [sortDir, setSortDir] = useS("desc");
  const [q, setQ] = useS("");

  const rows = useM(() => {
    const out = [];
    Object.keys(window.LIMITS).forEach(p => {
      const lim = window.LIMITS[p];
      const verif = window.VERIFICADO[p];
      const pct = (verif != null && lim.Instalado) ? (Math.abs(verif) / lim.Instalado) * 100 : null;
      out.push({ ponto: p, instalado: lim.Instalado, verificado: verif, pct, MUSTP: lim.MUSTP, MUSTFP: lim.MUSTFP });
    });
    return out;
  }, []);

  const sorted = useM(() => {
    const f = q.trim().toLowerCase();
    let arr = rows.filter(r => !f || r.ponto.toLowerCase().includes(f));
    arr.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [rows, sortKey, sortDir, q]);

  const toggle = (k) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
  };
  const arrow = (k) => sortKey !== k ? "" : (sortDir === "asc" ? " ↑" : " ↓");

  return (
    <div className="card flush">
      <div className="card-h">
        <div>
          <div className="card-h-title">Acompanhamento de carregamento</div>
          <div className="card-h-sub">21 pontos · ordenado por % do instalado</div>
        </div>
        <div className="search" style={{ width: 220 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar ponto..." />
        </div>
      </div>
      <div style={{ maxHeight: 440, overflow: "auto" }}>
        <table className="dt">
          <thead>
            <tr>
              <th onClick={() => toggle("ponto")} style={{ cursor: "pointer" }}>Ponto{arrow("ponto")}</th>
              <th className="num" onClick={() => toggle("instalado")} style={{ cursor: "pointer" }}>Instalado{arrow("instalado")}</th>
              <th className="num" onClick={() => toggle("verificado")} style={{ cursor: "pointer" }}>Verificado{arrow("verificado")}</th>
              <th onClick={() => toggle("pct")} style={{ cursor: "pointer", minWidth: 200 }}>% Carregamento{arrow("pct")}</th>
              <th className="num" onClick={() => toggle("MUSTP")} style={{ cursor: "pointer" }}>MUST·P</th>
              <th className="num" onClick={() => toggle("MUSTFP")} style={{ cursor: "pointer" }}>MUST·FP</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.ponto} style={{ background: picked === r.ponto ? "var(--accent-soft)" : undefined }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={"status-dot " + (pctClass(r.pct) === "hi" ? "bad" : pctClass(r.pct) === "md" ? "warn" : "ok")}></span>
                    {r.ponto}
                  </div>
                </td>
                <td className="num dim">{fmt(r.instalado, 0)}</td>
                <td className="num">{fmt(r.verificado, 1)}</td>
                <td><PctBar p={r.pct} /></td>
                <td className="num dim">{fmt(r.MUSTP, 0)}</td>
                <td className="num dim">{fmt(r.MUSTFP, 0)}</td>
                <td className="right">
                  <button className="h-control" onClick={() => onPick(r.ponto)}>Inspecionar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- MUST ----------
function MustPanel() {
  const [filter, setFilter] = useS("all");
  const all = useM(() => {
    const events = [];
    Object.keys(window.MUST_EXCEED).forEach(p => {
      window.MUST_EXCEED[p].forEach(ev => events.push({ ...ev, ponto: p }));
    });
    return events.sort((a,b) => b.ts.localeCompare(a.ts));
  }, []);
  const filtered = filter === "all" ? all : all.filter(e => e.type === filter);
  const totalP = all.filter(e => e.type === "MUSTP").length;
  const totalFP = all.filter(e => e.type === "MUSTFP").length;

  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi"><div className="kpi-label">Ultrapassagens · Ponta</div><div className="kpi-value">{totalP}<span className="kpi-unit">eventos</span></div><div className="kpi-delta">Janelas 18:30–21:30 · dias úteis</div></div>
        <div className="kpi"><div className="kpi-label">Ultrapassagens · Fora-ponta</div><div className="kpi-value">{totalFP}<span className="kpi-unit">eventos</span></div><div className="kpi-delta">Demais janelas</div></div>
        <div className="kpi"><div className="kpi-label">Pontos com ocorrência</div><div className="kpi-value">{Object.values(window.MUST_EXCEED).filter(l => l.length > 0).length}<span className="kpi-unit">de 21</span></div><div className="kpi-delta">Últimos 60 dias</div></div>
      </div>

      <div className="card flush">
        <div className="card-h">
          <div className="card-h-title">Ocorrências (15 min)</div>
          <div className="toggle-pill">
            <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas</button>
            <button className={filter === "MUSTP" ? "active" : ""} onClick={() => setFilter("MUSTP")}>Ponta</button>
            <button className={filter === "MUSTFP" ? "active" : ""} onClick={() => setFilter("MUSTFP")}>Fora-ponta</button>
          </div>
        </div>
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <table className="dt">
            <thead><tr><th>Data/Hora</th><th>Ponto</th><th>Tipo</th><th className="num">Limite</th><th className="num">Verificado</th><th className="num">Excedente</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="empty">Sem ocorrências no filtro atual.</td></tr>
              ) : filtered.map((e,i) => {
                const exc = ((e.value_mw - e.threshold) / e.threshold) * 100;
                return (
                  <tr key={i}>
                    <td className="num dim">{e.ts}</td>
                    <td>{e.ponto}</td>
                    <td><span className={"sev " + (e.type === "MUSTP" ? "hi" : "md")}>{e.type === "MUSTP" ? "Ponta" : "Fora-ponta"}</span></td>
                    <td className="num dim">{fmt(e.threshold, 0)}</td>
                    <td className="num">{fmt(e.value_mw, 2)}</td>
                    <td className="num" style={{ color: "var(--bad)" }}>+{exc.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ---------- RAO ----------
function RaoPanel() {
  const [sem, setSem] = useS("may_oct");
  const [year, setYear] = useS(2025);
  const rows = useM(() => {
    let s = year * 1000 + (sem === "may_oct" ? 1 : 2);
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return Object.keys(window.LIMITS).map(p => {
      const total = 4000 + Math.floor(rand() * 400);
      const validas = Math.floor(total * (0.85 + rand() * 0.13));
      const inv = total - validas;
      const dentro = Math.floor(validas * (0.78 + rand() * 0.18));
      return {
        ponto: p,
        total, validas, invalidas: inv,
        reverso: Math.floor(rand() * 50),
        desligado: inv - Math.floor(rand() * 50),
        dentro_count: dentro,
        dentro_pct: +((dentro/total)*100).toFixed(2),
        fora_count: total - dentro,
        fora_pct: +(((total-dentro)/total)*100).toFixed(2),
        ind: Math.floor(validas * (0.7 + rand()*0.2)),
        cap: validas - Math.floor(validas * (0.7 + rand()*0.2)),
      };
    });
  }, [sem, year]);

  const totals = useM(() => rows.reduce((acc, r) => ({
    total: acc.total + r.total, val: acc.val + r.validas, inv: acc.inv + r.invalidas
  }), { total: 0, val: 0, inv: 0 }), [rows]);

  return (
    <>
      <div className="card flush" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <div>
            <div className="card-h-title">Relatório RAO</div>
            <div className="card-h-sub">Resolução ANEEL · Apuração de medições por semestre</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="toggle-pill">
              <button className={sem === "may_oct" ? "active" : ""} onClick={() => setSem("may_oct")}>Mai – Out</button>
              <button className={sem === "nov_apr" ? "active" : ""} onClick={() => setSem("nov_apr")}>Nov – Abr</button>
            </div>
            <select className="h-control" value={year} onChange={e => setYear(+e.target.value)}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div><div className="eyebrow">Medições</div><div className="num" style={{ fontSize: 22 }}>{fmt(totals.total,0)}</div></div>
          <div><div className="eyebrow">Válidas</div><div className="num" style={{ fontSize: 22, color: "var(--good)" }}>{fmt(totals.val,0)}</div></div>
          <div><div className="eyebrow">Inválidas</div><div className="num" style={{ fontSize: 22, color: "var(--bad)" }}>{fmt(totals.inv,0)}</div></div>
          <div><div className="eyebrow">Cobertura</div><div className="num" style={{ fontSize: 22 }}>{((totals.val/totals.total)*100).toFixed(1)}%</div></div>
        </div>
      </div>

      <div className="card flush">
        <div style={{ maxHeight: 460, overflow: "auto" }}>
          <table className="dt">
            <thead>
              <tr>
                <th>Ponto</th>
                <th className="num">Total</th>
                <th className="num">Válidas</th>
                <th className="num">Inválidas</th>
                <th className="num">Reverso</th>
                <th className="num">Desligado</th>
                <th className="num">Dentro faixa</th>
                <th className="num">Fora faixa</th>
                <th className="num">Indutivo</th>
                <th className="num">Capacitivo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.ponto}>
                  <td>{r.ponto}</td>
                  <td className="num">{fmt(r.total,0)}</td>
                  <td className="num">{fmt(r.validas,0)}</td>
                  <td className="num dim">{fmt(r.invalidas,0)}</td>
                  <td className="num dim">{r.reverso}</td>
                  <td className="num dim">{r.desligado}</td>
                  <td className="num">{r.dentro_pct}% <span className="dim">({r.dentro_count})</span></td>
                  <td className="num" style={{ color: r.fora_pct > 15 ? "var(--bad)" : undefined }}>{r.fora_pct}% <span className="dim">({r.fora_count})</span></td>
                  <td className="num dim">{r.ind}</td>
                  <td className="num dim">{r.cap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ---------- Extremos Top N ----------
function ExtremosPanel({ ponto }) {
  const [topN, setTopN] = useS(5);
  const lim = window.LIMITS[ponto] || {};
  const data = useM(() => {
    let s = ponto.length * 31;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const gen = (max, min, isS) => {
      const out = { high: [], low: [] };
      for (let i = 0; i < topN; i++) {
        const dayIdx = Math.floor(rand() * 60);
        const day = window.AVAILABLE_DATES[dayIdx];
        const h = Math.floor(rand() * 24), m = [0,15,30,45][Math.floor(rand()*4)];
        const ts = `${day} ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
        const yr = +day.slice(0,4);
        out.high.push({ value: max * (0.92 + rand() * 0.08 - i * 0.01), ts, year: yr });
        out.low.push({ value: min * (0.92 + rand() * 0.08 - i * 0.01), ts, year: yr });
      }
      return out;
    };
    return {
      P: gen(lim.Pmax || 100, lim.Pmin || -20),
      S: gen(lim.Smax || lim.Pmax || 100, lim.Smin || -20),
    };
  }, [ponto, topN]);

  const TopTable = ({ title, items, unit }) => (
    <div>
      <div className="sub-h">{title}</div>
      <table className="dt" style={{ background: "var(--bg-elev)", border: "1px solid var(--border)", borderRadius: 6 }}>
        <thead><tr><th>#</th><th className="num">Valor</th><th>Data/Hora</th></tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td className="dim">{i+1}</td>
              <td className="num"><strong>{fmt(it.value, 2)}</strong> <span className="dim">{unit}</span></td>
              <td className="num dim">{it.ts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div className="card-h-title">Extremos · Top {topN}</div>
          <div className="card-h-sub">{ponto} · período: arquivo completo</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="eyebrow">Top N</span>
          <div className="toggle-pill">
            {[5, 10, 20].map(n => (
              <button key={n} className={topN === n ? "active" : ""} onClick={() => setTopN(n)}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <TopTable title="P · Máximos" items={data.P.high} unit="MW" />
        <TopTable title="P · Mínimos" items={data.P.low} unit="MW" />
        <TopTable title="S · Máximos" items={data.S.high} unit="MVA" />
        <TopTable title="S · Mínimos" items={data.S.low} unit="MVA" />
      </div>
    </div>
  );
}

// ---------- Balanço ----------
function BalancoPanel({ selected }) {
  const pts = Array.from(selected);
  if (pts.length < 2) {
    return (
      <div className="card">
        <div className="card-h-title">Balanço de pontos</div>
        <div className="card-h-sub" style={{ marginTop: 4 }}>Selecione 2 ou mais pontos no painel lateral para calcular extremos da soma.</div>
        <div className="empty">Aguardando seleção de pontos…</div>
      </div>
    );
  }
  const totals = useM(() => {
    let s = pts.join("").length * 17;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const sumP = pts.reduce((a, p) => a + (window.LIMITS[p].Pmax || 0), 0);
    const sumS = pts.reduce((a, p) => a + (window.LIMITS[p].Smax || 0), 0);
    const sumI = pts.reduce((a, p) => a + (window.LIMITS[p].Instalado || 0), 0);
    const top = (max) => Array.from({length: 5}, (_, i) => ({
      value: max * (0.95 - i * 0.02),
      ts: `${window.AVAILABLE_DATES[Math.floor(rand()*60)]} ${String(Math.floor(rand()*24)).padStart(2,"0")}:${[0,15,30,45][Math.floor(rand()*4)]}`,
    }));
    return { sumP, sumS, sumI, P: top(sumP), S: top(sumS) };
  }, [pts.join(",")]);

  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi"><div className="kpi-label">Soma · Instalado</div><div className="kpi-value">{fmt(totals.sumI, 0)}<span className="kpi-unit">MVA</span></div><div className="kpi-delta">{pts.length} pontos selecionados</div></div>
        <div className="kpi"><div className="kpi-label">Soma · Pmax</div><div className="kpi-value">{fmt(totals.sumP, 1)}<span className="kpi-unit">MW</span></div></div>
        <div className="kpi"><div className="kpi-label">Soma · Smax</div><div className="kpi-value">{fmt(totals.sumS, 1)}<span className="kpi-unit">MVA</span></div></div>
      </div>
      <div className="card">
        <div className="card-h-title" style={{ marginBottom: 4 }}>Pontos no balanço</div>
        <div className="chips" style={{ marginBottom: 16 }}>
          {pts.map(p => <span key={p} className="chip"><span className="swatch" style={{ background: "var(--accent)" }}></span>{p}</span>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div className="sub-h">P · Top 5 máximos</div>
            <table className="dt"><tbody>
              {totals.P.map((it,i) => <tr key={i}><td className="dim">{i+1}</td><td className="num"><strong>{fmt(it.value,2)}</strong> <span className="dim">MW</span></td><td className="num dim">{it.ts}</td></tr>)}
            </tbody></table>
          </div>
          <div>
            <div className="sub-h">S · Top 5 máximos</div>
            <table className="dt"><tbody>
              {totals.S.map((it,i) => <tr key={i}><td className="dim">{i+1}</td><td className="num"><strong>{fmt(it.value,2)}</strong> <span className="dim">MVA</span></td><td className="num dim">{it.ts}</td></tr>)}
            </tbody></table>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { AcompanhamentoTable, MustPanel, RaoPanel, ExtremosPanel, BalancoPanel });

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
const MUST_RENDER_LIMIT = 500;

function MustPanel() {
  const [filter, setFilter] = useS("all");
  const [pontoFilter, setPontoFilter] = useS("all");

  const events = window.MUST_EXCEED || {};
  const summary = window.MUST_SUMMARY || {};
  const pontosWithEvents = useM(() => Object.keys(summary).filter(p => (summary[p].total || 0) > 0).sort(), [summary]);

  const all = useM(() => {
    const out = [];
    const sources = pontoFilter === "all" ? Object.keys(events) : [pontoFilter];
    sources.forEach(p => {
      (events[p] || []).forEach(ev => out.push({ ...ev, ponto: p }));
    });
    out.sort((a, b) => b.ts.localeCompare(a.ts));
    return out;
  }, [events, pontoFilter]);

  const filtered = filter === "all" ? all : all.filter(e => e.type === filter);
  const visible = filtered.slice(0, MUST_RENDER_LIMIT);
  const truncated = filtered.length - visible.length;

  // KPIs use summary (pre-cap) so totals reflect the full dataset
  const totalP = useM(() => Object.values(summary).reduce((a, s) => a + (s.ponta || 0), 0), [summary]);
  const totalFP = useM(() => Object.values(summary).reduce((a, s) => a + (s.fora_ponta || 0), 0), [summary]);
  const pontosComOcorrencia = pontosWithEvents.length;
  const totalPontos = (window.POINTS && window.POINTS.length) || 21;

  return (
    <>
      <div className="kpi-grid" style={{ marginBottom: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi"><div className="kpi-label">Ultrapassagens · Ponta</div><div className="kpi-value">{totalP}<span className="kpi-unit">eventos</span></div><div className="kpi-delta">Janelas 18:30–21:30 · dias úteis</div></div>
        <div className="kpi"><div className="kpi-label">Ultrapassagens · Fora-ponta</div><div className="kpi-value">{totalFP}<span className="kpi-unit">eventos</span></div><div className="kpi-delta">Demais janelas</div></div>
        <div className="kpi"><div className="kpi-label">Pontos com ocorrência</div><div className="kpi-value">{pontosComOcorrencia}<span className="kpi-unit">de {totalPontos}</span></div><div className="kpi-delta">Período do arquivo</div></div>
      </div>

      <div className="card flush">
        <div className="card-h">
          <div className="card-h-title">Ocorrências (15 min)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="h-control" value={pontoFilter} onChange={e => setPontoFilter(e.target.value)} style={{ maxWidth: 200 }}>
              <option value="all">Todos os pontos</option>
              {pontosWithEvents.map(p => (
                <option key={p} value={p}>{p} ({summary[p].total})</option>
              ))}
            </select>
            <div className="toggle-pill">
              <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas</button>
              <button className={filter === "MUSTP" ? "active" : ""} onClick={() => setFilter("MUSTP")}>Ponta</button>
              <button className={filter === "MUSTFP" ? "active" : ""} onClick={() => setFilter("MUSTFP")}>Fora-ponta</button>
            </div>
          </div>
        </div>
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <table className="dt">
            <thead><tr><th>Data/Hora</th><th>Ponto</th><th>Tipo</th><th className="num">Limite</th><th className="num">Verificado</th><th className="num">Excedente</th></tr></thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan="6" className="empty">Sem ocorrências no filtro atual.</td></tr>
              ) : visible.map((e, i) => {
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
        {truncated > 0 && (
          <div style={{ padding: "10px 16px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
            Mostrando {visible.length} de {filtered.length} ocorrências. Filtre por ponto ou tipo para refinar.
          </div>
        )}
      </div>
    </>
  );
}

// ---------- RAO ----------
function RaoPanel() {
  const availableYears = useM(() => {
    const years = new Set();
    Object.keys(window.RAO_DATA || {}).forEach(k => {
      const y = parseInt(k.split("_")[0], 10);
      if (!isNaN(y)) years.add(y);
    });
    if (years.size === 0) [2024, 2025, 2026].forEach(y => years.add(y));
    return Array.from(years).sort((a, b) => a - b);
  }, []);
  const [sem, setSem] = useS("may_oct");
  const [year, setYear] = useS(availableYears[availableYears.length - 1]);
  const bucket = (window.RAO_DATA || {})[`${year}_${sem}`];
  const rows = bucket ? bucket.rows : [];
  const totals = useM(() => {
    if (bucket && bucket.totais) {
      return { total: bucket.totais.total, val: bucket.totais.validas, inv: bucket.totais.invalidas };
    }
    return rows.reduce((acc, r) => ({
      total: acc.total + r.total, val: acc.val + r.validas, inv: acc.inv + r.invalidas
    }), { total: 0, val: 0, inv: 0 });
  }, [bucket, rows]);

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
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div><div className="eyebrow">Medições</div><div className="num" style={{ fontSize: 22 }}>{fmt(totals.total,0)}</div></div>
          <div><div className="eyebrow">Válidas</div><div className="num" style={{ fontSize: 22, color: "var(--good)" }}>{fmt(totals.val,0)}</div></div>
          <div><div className="eyebrow">Inválidas</div><div className="num" style={{ fontSize: 22, color: "var(--bad)" }}>{fmt(totals.inv,0)}</div></div>
          <div><div className="eyebrow">Cobertura</div><div className="num" style={{ fontSize: 22 }}>{totals.total ? ((totals.val/totals.total)*100).toFixed(1) + "%" : "—"}</div></div>
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
  const top = (window.EXTREMOS_TOP || {})[ponto] || {};
  const data = useM(() => {
    const slice = (arr) => (arr || []).slice(0, topN);
    return {
      P: { high: slice(top.Pmax_top), low: slice(top.Pmin_top) },
      S: { high: slice(top.Smax_top), low: slice(top.Smin_top) },
    };
  }, [ponto, topN, top]);

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
function BalancoPanel({ selected, onToggle, onSetSelected }) {
  const allPontos = useM(() => Object.keys(window.LIMITS || {}).filter(k => k !== "Soma Total").sort(), []);
  const pts = Array.from(selected);

  const selectAll = () => onSetSelected(new Set(allPontos));
  const clearAll = () => onSetSelected(new Set());

  const totals = useM(() => {
    const sumP = pts.reduce((a, p) => a + ((window.LIMITS[p] && window.LIMITS[p].Pmax) || 0), 0);
    const sumS = pts.reduce((a, p) => a + ((window.LIMITS[p] && window.LIMITS[p].Smax) || 0), 0);
    const sumI = pts.reduce((a, p) => a + ((window.LIMITS[p] && window.LIMITS[p].Instalado) || 0), 0);
    return { sumP, sumS, sumI };
  }, [pts.join(",")]);

  const allSelected = pts.length === allPontos.length && allPontos.length > 0;
  const somaTopo = (window.EXTREMOS_TOP || {})["Soma Total"] || {};
  const showSomaTotalTop = allSelected;

  const Picker = (
    <div className="card flush" style={{ marginBottom: 16 }}>
      <div className="card-h">
        <div>
          <div className="card-h-title">Selecione os pontos</div>
          <div className="card-h-sub">{pts.length} de {allPontos.length} selecionados</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="h-control" onClick={selectAll} disabled={allSelected}>Todos</button>
          <button className="h-control" onClick={clearAll} disabled={pts.length === 0}>Limpar</button>
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <div className="chips">
          {allPontos.map(p => {
            const isSel = selected.has(p);
            return (
              <button key={p} className="chip"
                onClick={() => onToggle(p)}
                style={{
                  cursor: "pointer", paddingRight: 10,
                  background: isSel ? "var(--accent-soft)" : "var(--bg-elev)",
                  color: isSel ? "var(--accent)" : undefined,
                  borderColor: isSel ? "var(--accent)" : "var(--border)",
                }}>
                <span className="swatch" style={{ background: isSel ? "var(--accent)" : "var(--text-faint)" }}></span>
                {p}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (pts.length < 2) {
    return (
      <>
        {Picker}
        <div className="card">
          <div className="card-h-title">Balanço de pontos</div>
          <div className="card-h-sub" style={{ marginTop: 4 }}>Selecione 2 ou mais pontos acima para calcular a soma.</div>
          <div className="empty">Aguardando seleção…</div>
        </div>
      </>
    );
  }

  return (
    <>
      {Picker}
      <div className="kpi-grid" style={{ marginBottom: 16, gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="kpi"><div className="kpi-label">Soma · Instalado</div><div className="kpi-value">{fmt(totals.sumI, 0)}<span className="kpi-unit">MVA</span></div><div className="kpi-delta">{pts.length} pontos</div></div>
        <div className="kpi"><div className="kpi-label">Soma · Pmax (limites)</div><div className="kpi-value">{fmt(totals.sumP, 1)}<span className="kpi-unit">MW</span></div></div>
        <div className="kpi"><div className="kpi-label">Soma · Smax (limites)</div><div className="kpi-value">{fmt(totals.sumS, 1)}<span className="kpi-unit">MVA</span></div></div>
      </div>
      {showSomaTotalTop ? (
        <div className="card">
          <div className="card-h-title" style={{ marginBottom: 4 }}>Soma Total · Top 5 históricos</div>
          <div className="card-h-sub" style={{ marginBottom: 16 }}>Extremos da soma de todos os pontos ao longo do arquivo.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div className="sub-h">P · Máximos</div>
              <table className="dt"><tbody>
                {(somaTopo.Pmax_top || []).slice(0, 5).map((it, i) => (
                  <tr key={i}><td className="dim">{i + 1}</td><td className="num"><strong>{fmt(it.value, 2)}</strong> <span className="dim">MW</span></td><td className="num dim">{it.ts}</td></tr>
                ))}
              </tbody></table>
            </div>
            <div>
              <div className="sub-h">S · Máximos</div>
              <table className="dt"><tbody>
                {(somaTopo.Smax_top || []).slice(0, 5).map((it, i) => (
                  <tr key={i}><td className="dim">{i + 1}</td><td className="num"><strong>{fmt(it.value, 2)}</strong> <span className="dim">MVA</span></td><td className="num dim">{it.ts}</td></tr>
                ))}
              </tbody></table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-h-title">Top 5 do subconjunto</div>
          <div className="card-h-sub" style={{ marginTop: 4 }}>
            Top 5 históricos só estão pré-calculados para "Soma Total" (todos os pontos). Selecione todos os pontos para visualizar, ou utilize a aba <strong>Extremos</strong> para um ponto específico.
          </div>
        </div>
      )}
    </>
  );
}

Object.assign(window, { AcompanhamentoTable, MustPanel, RaoPanel, ExtremosPanel, BalancoPanel });

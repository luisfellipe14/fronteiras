// app.jsx — Composição principal
const { useState, useMemo, useEffect } = React;

const NAV = [
  { id: "overview", label: "Visão geral", group: "Operação" },
  { id: "acomp", label: "Acompanhamento", group: "Operação" },
  { id: "must", label: "MUST", group: "Operação" },
  { id: "extremos", label: "Extremos", group: "Análise" },
  { id: "balanco", label: "Balanço", group: "Análise" },
  { id: "rao", label: "RAO", group: "Relatórios" },
];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "density": "comfortable",
  "typeface": "sans",
  "showMap": true,
  "accentHue": 255
}/*EDITMODE-END*/;

function NavIcon({ id }) {
  const paths = {
    overview: "M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 14h7v7H3z",
    acomp:    "M3 12h4l3-8 4 16 3-8h4",
    must:     "M12 2L2 22h20L12 2zm0 6v6m0 4v.01",
    extremos: "M3 3v18h18M7 14l4-4 4 4 5-7",
    balanco:  "M5 4h14M5 12h14M5 20h14M9 4v16M15 4v16",
    rao:      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h6",
  };
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[id]} />
    </svg>
  );
}

function App() {
  // Tweaks
  const [tweaks, setTweaksState] = useState(TWEAK_DEFAULTS);
  const setTweak = (k, v) => {
    const upd = typeof k === "object" ? k : { [k]: v };
    setTweaksState(s => ({ ...s, ...upd }));
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: upd }, "*"); } catch {}
  };

  // Edit mode protocol
  const [editVisible, setEditVisible] = useState(false);
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data || {};
      if (d.type === "__activate_edit_mode") setEditVisible(true);
      if (d.type === "__deactivate_edit_mode") setEditVisible(false);
    };
    window.addEventListener("message", onMsg);
    try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch {}
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Aplicar tweaks ao root
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = tweaks.theme;
    root.dataset.density = tweaks.density;
    root.dataset.typeface = tweaks.typeface;
    root.style.setProperty("--accent", `oklch(58% 0.18 ${tweaks.accentHue})`);
    root.style.setProperty("--accent-soft", tweaks.theme === "dark" ? `oklch(28% 0.06 ${tweaks.accentHue})` : `oklch(95% 0.04 ${tweaks.accentHue})`);
  }, [tweaks]);

  // Estado
  const [section, setSection] = useState("overview");
  const [date, setDate] = useState(window.AVAILABLE_DATES[window.AVAILABLE_DATES.length - 1]);
  const [tipo, setTipo] = useState("S"); // S ou P
  const [picked, setPicked] = useState("Coxipo"); // ponto inspecionado no gráfico
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");

  const limits = window.LIMITS[picked] || {};
  const series = useMemo(() => window.genSeries(picked, date, tipo), [picked, date, tipo]);

  const toggleSel = (p) => {
    setSelected(s => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p); else n.add(p);
      return n;
    });
  };

  const stepDay = (d) => {
    const i = window.AVAILABLE_DATES.indexOf(date);
    const ni = Math.max(0, Math.min(window.AVAILABLE_DATES.length - 1, i + d));
    setDate(window.AVAILABLE_DATES[ni]);
  };

  const formatDateBR = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const groups = ["Operação", "Análise", "Relatórios"];

  // KPIs (overview)
  const kpis = useMemo(() => {
    const totalI = window.TOTAL_INSTALADO;
    const totalV = window.TOTAL_VERIFICADO;
    const carga = (totalV / totalI) * 100;
    const pontos = Object.keys(window.LIMITS);
    const sobrecarga = pontos.filter(p => {
      const v = window.VERIFICADO[p];
      const i = window.LIMITS[p].Instalado;
      return v && i && (Math.abs(v) / i) > 0.9;
    }).length;
    const eventosMust = Object.values(window.MUST_EXCEED).reduce((a, b) => a + b.length, 0);
    return { totalI, totalV, carga, sobrecarga, eventosMust };
  }, []);

  const filteredPoints = useMemo(() => {
    const f = search.trim().toLowerCase();
    return window.POINTS.filter(p => !f || p.point.toLowerCase().includes(f));
  }, [search]);

  // Pontos com alerta para mapa
  const alerts = useMemo(() => {
    const out = {};
    Object.keys(window.LIMITS).forEach(p => {
      const v = window.VERIFICADO[p], i = window.LIMITS[p].Instalado;
      if (v && i && (Math.abs(v) / i) > 0.9) out[p] = true;
    });
    return out;
  }, []);

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"></div>
          <div>
            <div className="brand-name">Rede Básica</div>
            <div className="brand-sub">Demandas · MT</div>
          </div>
        </div>
        {groups.map(g => (
          <div key={g} className="nav-group">
            <div className="nav-group-label">{g}</div>
            {NAV.filter(n => n.group === g).map(n => (
              <div key={n.id} className={"nav-item " + (section === n.id ? "active" : "")} onClick={() => setSection(n.id)}>
                <NavIcon id={n.id} />
                <span>{n.label}</span>
                {n.id === "must" && kpis.eventosMust > 0 && <span className="nav-badge">{kpis.eventosMust}</span>}
                {n.id === "acomp" && kpis.sobrecarga > 0 && <span className="nav-badge">{kpis.sobrecarga}</span>}
              </div>
            ))}
          </div>
        ))}
        <div className="sidebar-foot">
          <span className="dot"></span>
          <span>Dados sincronizados</span>
          <span style={{ marginLeft: "auto", color: "var(--text-faint)" }}>v2.0</span>
        </div>
      </aside>

      {/* Header */}
      <header className="header">
        <div className="crumbs">
          <span style={{ color: "var(--text-faint)" }}>Operação</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{NAV.find(n => n.id === section)?.label}</span>
        </div>
        <div className="header-spacer"></div>

        {section !== "rao" && (
          <>
            <div className="date-stepper">
              <button onClick={() => stepDay(-1)} title="Dia anterior">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="date-display">{formatDateBR(date)}</div>
              <button onClick={() => stepDay(1)} title="Próximo dia">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
            <div className="toggle-pill">
              <button className={tipo === "S" ? "active" : ""} onClick={() => setTipo("S")}>S · MVA</button>
              <button className={tipo === "P" ? "active" : ""} onClick={() => setTipo("P")}>P · MW</button>
            </div>
          </>
        )}

        <button className="h-control" title="Tema" onClick={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}>
          {tweaks.theme === "dark" ? "☀" : "☾"}
        </button>
        <button className="h-control primary">Exportar</button>
      </header>

      {/* Main */}
      <main className="main">
        {section === "overview" && (
          <>
            <div className="kpi-grid">
              <div className="kpi">
                <div className="kpi-label">Carregamento total</div>
                <div className="kpi-value">{kpis.carga.toFixed(1)}<span className="kpi-unit">%</span></div>
                <div className="kpi-delta down"><span className="status-dot ok"></span>Dentro do esperado</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Capacidade instalada</div>
                <div className="kpi-value">{(kpis.totalI / 1000).toFixed(2)}<span className="kpi-unit">GVA</span></div>
                <div className="kpi-delta">{Object.keys(window.LIMITS).length} pontos · MT</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Pontos próximos do limite</div>
                <div className="kpi-value">{kpis.sobrecarga}<span className="kpi-unit">/ 21</span></div>
                <div className="kpi-delta up"><span className="status-dot bad"></span>Acima de 90% do instalado</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Ultrapassagens MUST</div>
                <div className="kpi-value">{kpis.eventosMust}<span className="kpi-unit">eventos</span></div>
                <div className="kpi-delta">Últimos 60 dias</div>
              </div>
            </div>

            <div className="row-2">
              <div className="card flush">
                <div className="card-h">
                  <div>
                    <div className="card-h-title">{picked} <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>· {tipo === "S" ? "Potência aparente" : "Potência ativa"}</span></div>
                    <div className="card-h-sub">{formatDateBR(date)} · 96 amostras (15 min)</div>
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                    <div className="status"><span className="status-dot bad"></span>Limite máx</div>
                    <div className="status"><span style={{ width: 14, height: 2, background: "var(--bad)", display: "inline-block", border: "1px dashed var(--bad)", borderWidth: "1px 0" }}></span>MUST</div>
                    <div className="status"><span style={{ width: 14, height: 2, background: "var(--accent)", display: "inline-block" }}></span>Verificado</div>
                  </div>
                </div>
                <div style={{ padding: "8px 16px 16px" }}>
                  <TimeSeriesChart series={series} lim={limits} tipo={tipo} height={340} accent={`oklch(58% 0.18 ${tweaks.accentHue})`} />
                </div>
                <div style={{ padding: "0 20px 16px", display: "flex", gap: 24, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  <div><div className="eyebrow">Pico do dia</div><div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{Math.max(...series.values).toFixed(2)} <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{tipo === "S" ? "MVA" : "MW"}</span></div></div>
                  <div><div className="eyebrow">Mín do dia</div><div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{Math.min(...series.values).toFixed(2)}</div></div>
                  <div><div className="eyebrow">Média</div><div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{(series.values.reduce((a,b)=>a+b,0)/series.values.length).toFixed(2)}</div></div>
                  <div><div className="eyebrow">Limite</div><div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{tipo === "P" ? (limits.Pmax || "—") : (limits.Smax?.toFixed(1) || "—")}</div></div>
                  <div style={{ marginLeft: "auto", alignSelf: "end" }}>
                    <div className="eyebrow">% do limite</div>
                    <div className="num" style={{ fontSize: 18, fontWeight: 600, color: "var(--bad)" }}>
                      {(() => {
                        const l = tipo === "P" ? limits.Pmax : limits.Smax;
                        if (!l) return "—";
                        return ((Math.max(...series.values) / l) * 100).toFixed(1) + "%";
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
                {tweaks.showMap && (
                  <div className="card">
                    <div className="card-h-title" style={{ marginBottom: 6 }}>Mato Grosso</div>
                    <div className="card-h-sub" style={{ marginBottom: 12 }}>Clique nos pontos para selecionar</div>
                    <MiniMap points={window.POINTS} selected={selected} onToggle={toggleSel} alerts={alerts} />
                  </div>
                )}
                <div className="card flush">
                  <div className="card-h">
                    <div className="card-h-title">Pontos</div>
                    <div className="card-h-sub">{selected.size} sel.</div>
                  </div>
                  <div style={{ padding: 12 }}>
                    <div className="search">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filtrar pontos..." />
                    </div>
                  </div>
                  <div style={{ maxHeight: 320, overflow: "auto", padding: "0 8px 12px" }}>
                    <div className="filter-list">
                      {filteredPoints.map(p => {
                        const v = window.VERIFICADO[p.point], inst = window.LIMITS[p.point]?.Instalado;
                        const pct = (v && inst) ? (Math.abs(v)/inst)*100 : null;
                        return (
                          <div key={p.point} className={"filter-row " + (selected.has(p.point) ? "checked" : "")} onClick={() => { toggleSel(p.point); setPicked(p.point); }}>
                            <div className="filter-check">
                              {selected.has(p.point) && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 12 5 5L20 7"/></svg>
                              )}
                            </div>
                            <div className="filter-name">{p.point}</div>
                            <div className="filter-pct">{pct != null ? pct.toFixed(0) + "%" : "—"}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {section === "acomp" && (
          <AcompanhamentoTable picked={picked} onPick={(p) => { setPicked(p); setSection("overview"); }} />
        )}

        {section === "must" && <MustPanel />}

        {section === "extremos" && (
          <>
            <div className="card flush" style={{ marginBottom: "var(--gap)" }}>
              <div className="card-h">
                <div className="card-h-title">Selecione um ponto</div>
                <div className="card-h-sub">Atual: {picked}</div>
              </div>
              <div style={{ padding: 12 }}>
                <div className="chips">
                  {window.POINTS.map(p => (
                    <button key={p.point} className={"chip " + (picked === p.point ? "" : "")}
                            onClick={() => setPicked(p.point)}
                            style={{ cursor: "pointer", background: picked === p.point ? "var(--accent-soft)" : "var(--bg-elev)", color: picked === p.point ? "var(--accent)" : undefined, paddingRight: 10 }}>
                      {p.point}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <ExtremosPanel ponto={picked} />
          </>
        )}

        {section === "balanco" && <BalancoPanel selected={selected} />}

        {section === "rao" && <RaoPanel />}
      </main>

      {/* Tweaks */}
      {editVisible && (
        <TweaksPanel title="Tweaks" onClose={() => { setEditVisible(false); try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch {} }}>
          <TweakSection title="Aparência">
            <TweakRadio label="Tema" value={tweaks.theme} options={[{value:"light",label:"Claro"},{value:"dark",label:"Escuro"}]} onChange={v => setTweak("theme", v)} />
            <TweakRadio label="Densidade" value={tweaks.density} options={[{value:"comfortable",label:"Confortável"},{value:"compact",label:"Compacta"}]} onChange={v => setTweak("density", v)} />
            <TweakRadio label="Tipografia" value={tweaks.typeface} options={[{value:"sans",label:"Sans"},{value:"serif",label:"Serif"},{value:"mono",label:"Mono"}]} onChange={v => setTweak("typeface", v)} />
            <TweakSlider label="Cor de destaque (hue)" value={tweaks.accentHue} min={0} max={360} step={5} onChange={v => setTweak("accentHue", v)} />
          </TweakSection>
          <TweakSection title="Layout">
            <TweakToggle label="Mostrar mapa" value={tweaks.showMap} onChange={v => setTweak("showMap", v)} />
          </TweakSection>
        </TweaksPanel>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

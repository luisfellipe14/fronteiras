// chart.jsx — Gráfico de série temporal com banda de limites (SVG nativo)
const { useMemo, useRef, useState, useEffect } = React;

function TimeSeriesChart({ series, lim, tipo, height = 320, accent = "var(--accent)" }) {
  const ref = useRef(null);
  const [w, setW] = useState(800);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.max(320, e.contentRect.width));
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const padL = 44, padR = 16, padT = 16, padB = 28;
  const chartW = w - padL - padR;
  const chartH = height - padT - padB;

  const { labels, values } = series;
  const N = values.length;

  // limites para Y
  const refMax = Math.max(
    ...values,
    lim?.MUSTP || 0, lim?.MUSTFP || 0,
    tipo === "P" ? (lim?.Pmax || 0) : (lim?.Smax || 0)
  );
  const refMin = Math.min(
    ...values,
    tipo === "P" ? (lim?.Pmin || 0) : (lim?.Smin || 0),
    0
  );
  const yMax = refMax * 1.08;
  const yMin = refMin * 1.05;
  const yRange = yMax - yMin || 1;

  const xAt = (i) => padL + (i / (N - 1)) * chartW;
  const yAt = (v) => padT + (1 - (v - yMin) / yRange) * chartH;

  // banda de limites: max e min (se houver)
  const limMax = tipo === "P" ? lim?.Pmax : lim?.Smax;
  const limMin = tipo === "P" ? lim?.Pmin : lim?.Smin;
  const must = lim?.MUSTP;
  const mustFp = lim?.MUSTFP;

  // path da linha
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${xAt(N-1).toFixed(1)},${yAt(yMin).toFixed(1)} L${xAt(0).toFixed(1)},${yAt(yMin).toFixed(1)} Z`;

  // ticks Y (5 níveis)
  const yTicks = [];
  for (let i = 0; i <= 4; i++) {
    const v = yMin + (yRange * i / 4);
    yTicks.push(v);
  }

  // ticks X: 5 igualmente espaçados ao longo da série (independente do tamanho)
  const xTickIdx = N <= 1
    ? [0]
    : [0, Math.floor((N - 1) * 0.25), Math.floor((N - 1) * 0.5), Math.floor((N - 1) * 0.75), N - 1];

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round(((x - padL) / chartW) * (N - 1));
    if (idx >= 0 && idx < N) setHover({ idx, x: xAt(idx), v: values[idx] });
  };

  return (
    <div ref={ref} style={{ width: "100%", position: "relative" }}>
      <svg width={w} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ display: "block" }}>
        <defs>
          <linearGradient id="series-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.15" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <pattern id="band-stripe" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--bad)" strokeOpacity="0.1" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Banda fora-do-limite (acima do max) */}
        {limMax != null && (
          <rect x={padL} y={padT} width={chartW} height={Math.max(0, yAt(limMax) - padT)}
                fill="url(#band-stripe)" />
        )}
        {/* Banda fora-do-limite (abaixo do min, se min < 0) */}
        {limMin != null && limMin < 0 && (
          <rect x={padL} y={yAt(limMin)} width={chartW} height={Math.max(0, padT + chartH - yAt(limMin))}
                fill="url(#band-stripe)" />
        )}

        {/* Grid Y */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={padL} y1={yAt(v)} x2={padL + chartW} y2={yAt(v)}
                  stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 8} y={yAt(v) + 3} fontSize="10" textAnchor="end"
                  fill="var(--text-faint)" fontFamily="var(--font-mono)">
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Linha de zero */}
        {yMin < 0 && (
          <line x1={padL} y1={yAt(0)} x2={padL + chartW} y2={yAt(0)}
                stroke="var(--border-strong)" strokeWidth="1" />
        )}

        {/* MUST lines */}
        {must != null && (
          <g>
            <line x1={padL} y1={yAt(must)} x2={padL + chartW} y2={yAt(must)}
                  stroke="var(--bad)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <text x={padL + chartW - 6} y={yAt(must) - 4} fontSize="10" textAnchor="end"
                  fill="var(--bad)" fontFamily="var(--font-mono)">
              MUST·P {must}
            </text>
          </g>
        )}
        {mustFp != null && mustFp !== must && (
          <g>
            <line x1={padL} y1={yAt(mustFp)} x2={padL + chartW} y2={yAt(mustFp)}
                  stroke="var(--warn)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <text x={padL + chartW - 6} y={yAt(mustFp) - 4} fontSize="10" textAnchor="end"
                  fill="var(--warn)" fontFamily="var(--font-mono)">
              MUST·FP {mustFp}
            </text>
          </g>
        )}

        {/* Linha do limite max (sólida) */}
        {limMax != null && (
          <line x1={padL} y1={yAt(limMax)} x2={padL + chartW} y2={yAt(limMax)}
                stroke="var(--bad)" strokeWidth="1.5" opacity="0.5" />
        )}

        {/* Área e linha */}
        <path d={areaPath} fill="url(#series-fill)" />
        <path d={linePath} fill="none" stroke={accent} strokeWidth="1.6" />

        {/* X ticks */}
        {xTickIdx.map((i) => (
          <g key={i}>
            <text x={xAt(i)} y={padT + chartH + 16} fontSize="10" textAnchor="middle"
                  fill="var(--text-faint)" fontFamily="var(--font-mono)">
              {labels[i]}
            </text>
          </g>
        ))}

        {/* hover */}
        {hover && (
          <g>
            <line x1={hover.x} y1={padT} x2={hover.x} y2={padT + chartH}
                  stroke="var(--text-faint)" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx={hover.x} cy={yAt(hover.v)} r="4" fill={accent} stroke="var(--bg-elev)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover && (
        <div style={{
          position: "absolute", top: 8, right: 16,
          background: "var(--bg-elev)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "6px 10px", fontSize: 12, boxShadow: "var(--shadow-sm)",
          fontFamily: "var(--font-mono)", display: "flex", gap: 12, alignItems: "center",
        }}>
          <span style={{ color: "var(--text-faint)" }}>{labels[hover.idx]}</span>
          <span style={{ fontWeight: 600 }}>{hover.v.toFixed(2)}</span>
          <span style={{ color: "var(--text-faint)" }}>{tipo === "P" ? "MW" : "MVA"}</span>
        </div>
      )}
    </div>
  );
}

window.TimeSeriesChart = TimeSeriesChart;

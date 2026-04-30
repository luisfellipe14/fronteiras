// map.jsx — Mapa coadjuvante de Mato Grosso, SVG simples com pinos
const { useMemo: useMemoMap } = React;

// Bounding box aproximado do Mato Grosso
const MT_BOUNDS = { latMin: -18.0, latMax: -9.5, lonMin: -61.5, lonMax: -50.0 };

function projectMT(lat, lon, w, h) {
  const x = ((lon - MT_BOUNDS.lonMin) / (MT_BOUNDS.lonMax - MT_BOUNDS.lonMin)) * w;
  const y = ((MT_BOUNDS.latMax - lat) / (MT_BOUNDS.latMax - MT_BOUNDS.latMin)) * h;
  return { x, y };
}

function MiniMap({ points, selected, onToggle, alerts = {} }) {
  const W = 360, H = 260;
  // contorno simplificado de MT (pseudo, fica como silhueta)
  const outline = "M 50,40 L 280,30 L 320,90 L 340,160 L 290,210 L 220,235 L 130,225 L 70,180 L 30,120 Z";

  return (
    <div className="map-mini" title="Mato Grosso — pontos da rede básica">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <path d={outline} fill="var(--bg-elev)" stroke="var(--border-strong)" strokeWidth="1" />
        {/* eixos cardinais sutis */}
        <text x={W - 14} y={16} fontSize="9" fill="var(--text-faint)" textAnchor="end" fontFamily="var(--font-mono)">MT</text>

        {points.map(p => {
          const { x, y } = projectMT(p.lat, p.lon, W, H);
          const isSel = selected.has(p.point);
          const isAlert = alerts[p.point];
          return (
            <g key={p.point} onClick={() => onToggle(p.point)} style={{ cursor: "pointer" }}>
              <circle
                cx={x} cy={y}
                r={isSel ? 5.5 : 3.5}
                fill={isAlert ? "var(--bad)" : (isSel ? "var(--accent)" : "var(--text-faint)")}
                stroke="var(--bg-elev)" strokeWidth="1.5"
              />
              {isSel && (
                <text x={x + 8} y={y + 3} fontSize="9" fill="var(--text)" fontFamily="var(--font-mono)">
                  {p.point}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

window.MiniMap = MiniMap;

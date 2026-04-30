"""Preprocess demandas.csv (5-min energy increments per medidor channel) into
JSON files consumed by the static dashboard.

Inputs:
  csv/limites.csv
  csv/points.csv
  csv/demandas.csv          (downloaded from a GitHub Release in CI)

Outputs (under data/):
  meta.json                 points, limits, dates, totals, acompanhamento
  series/<YYYY-MM-DD>.json  per-day P/Q/S samples per ponto (one file per day)
  must.json                 MUST exceedances per ponto + Soma Total
  extremos.json             Top-N (P/S, max/min) per ponto + Soma Total
  rao.json                  RAO report per (year, semester) per ponto
"""
from __future__ import annotations

import json
import math
import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from datetime import datetime

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parent.parent
CSV_DIR = ROOT / "csv"
OUT_DIR = ROOT / "data"
SERIES_DIR = OUT_DIR / "series"

DEMANDAS = CSV_DIR / "demandas.csv"
LIMITES = CSV_DIR / "limites.csv"
POINTS = CSV_DIR / "points.csv"

CHUNKSIZE = 50_000
TOP_N = 20


def to_float(s):
    if s is None:
        return None
    s = str(s).strip().replace(",", ".")
    if not s or s in {"#N/D", "#N/A", "NA", "nan", "NaN"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def round_or_none(v, ndigits=3):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    return round(float(v), ndigits)


def load_points():
    df = pd.read_csv(POINTS, sep=";", encoding="utf-8-sig", dtype=str).fillna("")
    cols = {c.strip().lower(): c for c in df.columns}
    out = []
    for _, row in df.iterrows():
        out.append({
            "point": str(row[cols["point"]]).strip(),
            "lat": float(str(row[cols["lat"]]).replace(",", ".")),
            "lon": float(str(row[cols["lon"]]).replace(",", ".")),
        })
    return out


def load_limits():
    df = pd.read_csv(LIMITES, sep=";", encoding="utf-8-sig", dtype=str).fillna("")
    out = {}
    for _, row in df.iterrows():
        ponto = str(row.iloc[0]).strip()
        if not ponto:
            continue
        pmax = to_float(row.get("Pmax"))
        qmax = to_float(row.get("Qmax"))
        pmin = to_float(row.get("Pmin"))
        qmin = to_float(row.get("Qmin"))
        smax = math.sqrt(pmax * pmax + qmax * qmax) if pmax is not None and qmax is not None else None
        smin = None
        if pmin is not None and qmin is not None:
            v = math.sqrt(pmin * pmin + qmin * qmin)
            smin = -v if pmin < 0 else v
        out[ponto] = {
            "Pmax": pmax, "Pmin": pmin,
            "Qmax": qmax, "Qmin": qmin,
            "Smax": smax, "Smin": smin,
            "MUSTP": to_float(row.get("MUSTP")),
            "MUSTFP": to_float(row.get("MUSTFP")),
            "Instalado": to_float(row.get("Instalado")),
        }
    return out


def parse_med_column(med_full: str):
    """`MTBN--CNPA-01P-EAE` -> (med_id='MTBN--CNPA-01', side='P', channel='EAE')."""
    if not med_full or med_full == "nan":
        return None
    if "-" not in med_full:
        return None
    base_id, channel = med_full.rsplit("-", 1)
    channel = channel.strip().upper()
    base_id = base_id.strip()
    if base_id.endswith("P"):
        return (base_id[:-1], "P", channel)
    if base_id.endswith("R"):
        return (base_id[:-1], "R", channel)
    return (base_id, "P", channel)


def build_column_mapping():
    """Read just the header to build {(ponto, med_id): {side: {channel: col_idx}}}."""
    head = pd.read_csv(
        DEMANDAS, sep=";", header=[0, 1], nrows=0, encoding="utf-8-sig", low_memory=False
    )
    columns = list(head.columns)  # list of (ponto_str, med_full_str)
    datahora_idx = None
    mapping: dict = defaultdict(lambda: {"P": {}, "R": {}})

    for i, col in enumerate(columns):
        ponto = str(col[0]).strip()
        med_full = str(col[1]).strip()
        # DataHora can be in either header row
        if ponto.lower() == "datahora" or med_full.lower() == "datahora":
            datahora_idx = i
            continue
        parsed = parse_med_column(med_full)
        if not parsed:
            continue
        med_id, side, channel = parsed
        mapping[(ponto, med_id)][side][channel] = i

    if datahora_idx is None:
        datahora_idx = 0
    return columns, datahora_idx, mapping


def parse_brazil_float_col(series: pd.Series) -> np.ndarray:
    """Vectorized `safe_to_numeric` matching the original app.py behavior."""
    s = series.astype(str).str.strip()
    s = s.str.replace(",", ".", regex=False)
    # strip anything not numeric (matches original regex)
    s = s.str.replace(r"[^0-9eE+\-.]", "", regex=True)
    return pd.to_numeric(s, errors="coerce").to_numpy(dtype=np.float32)


def process_csv():
    print(f"[preprocess] reading headers from {DEMANDAS}", flush=True)
    columns, datahora_idx, mapping = build_column_mapping()
    pontos = sorted({ponto for (ponto, _med) in mapping.keys()})
    print(f"[preprocess] {len(columns)} cols · {len(pontos)} pontos · "
          f"{sum(1 for _ in mapping)} medidores", flush=True)

    # accumulate per-point series across all chunks
    p_acc: dict[str, list[np.ndarray]] = defaultdict(list)
    q_acc: dict[str, list[np.ndarray]] = defaultdict(list)
    ts_acc: list[pd.Series] = []

    total_rows = 0
    for chunk_idx, chunk in enumerate(pd.read_csv(
        DEMANDAS, sep=";", header=[0, 1], chunksize=CHUNKSIZE,
        encoding="utf-8-sig", dtype=str, low_memory=False,
    )):
        n = len(chunk)
        total_rows += n
        ts = pd.to_datetime(chunk.iloc[:, datahora_idx], dayfirst=True, errors="coerce")
        ts_acc.append(ts)

        # medidor → (P_kWh, Q_kWh) on this chunk
        chunk_p: dict[str, np.ndarray] = {p: np.zeros(n, dtype=np.float32) for p in pontos}
        chunk_q: dict[str, np.ndarray] = {p: np.zeros(n, dtype=np.float32) for p in pontos}
        chunk_p_any: dict[str, np.ndarray] = {p: np.zeros(n, dtype=bool) for p in pontos}
        chunk_q_any: dict[str, np.ndarray] = {p: np.zeros(n, dtype=bool) for p in pontos}

        nan_arr = np.full(n, np.nan, dtype=np.float32)

        for (ponto, med_id), sides in mapping.items():
            def col(side, ch):
                idx = sides.get(side, {}).get(ch)
                if idx is None:
                    return nan_arr
                return parse_brazil_float_col(chunk.iloc[:, idx])

            p_eae, p_ear = col("P", "EAE"), col("P", "EAR")
            r_eae, r_ear = col("R", "EAE"), col("R", "EAR")

            mask_p = ~np.isnan(p_eae) & ~np.isnan(p_ear)
            mask_r = ~np.isnan(r_eae) & ~np.isnan(r_ear)
            P = np.full(n, np.nan, dtype=np.float32)
            P[mask_p] = p_eae[mask_p] - p_ear[mask_p]
            use_r_only = ~mask_p & mask_r
            P[use_r_only] = r_eae[use_r_only] - r_ear[use_r_only]
            remaining = np.isnan(P)
            fallback = (np.nan_to_num(p_eae) - np.nan_to_num(p_ear)
                        + np.nan_to_num(r_eae) - np.nan_to_num(r_ear))
            P[remaining] = fallback[remaining]

            p_ere, p_err = col("P", "ERE"), col("P", "ERR")
            r_ere, r_err = col("R", "ERE"), col("R", "ERR")
            mask_pq = ~np.isnan(p_ere) & ~np.isnan(p_err)
            mask_rq = ~np.isnan(r_ere) & ~np.isnan(r_err)
            Q = np.full(n, np.nan, dtype=np.float32)
            Q[mask_pq] = p_ere[mask_pq] - p_err[mask_pq]
            use_r_only_q = ~mask_pq & mask_rq
            Q[use_r_only_q] = r_ere[use_r_only_q] - r_err[use_r_only_q]
            remaining_q = np.isnan(Q)
            fallback_q = (np.nan_to_num(p_ere) - np.nan_to_num(p_err)
                          + np.nan_to_num(r_ere) - np.nan_to_num(r_err))
            Q[remaining_q] = fallback_q[remaining_q]

            mask_p_valid = ~np.isnan(P)
            chunk_p[ponto][mask_p_valid] += P[mask_p_valid]
            chunk_p_any[ponto] |= mask_p_valid
            mask_q_valid = ~np.isnan(Q)
            chunk_q[ponto][mask_q_valid] += Q[mask_q_valid]
            chunk_q_any[ponto] |= mask_q_valid

        for ponto in pontos:
            arr_p = chunk_p[ponto].copy()
            arr_p[~chunk_p_any[ponto]] = np.nan
            arr_q = chunk_q[ponto].copy()
            arr_q[~chunk_q_any[ponto]] = np.nan
            p_acc[ponto].append(arr_p)
            q_acc[ponto].append(arr_q)

        print(f"[preprocess] chunk {chunk_idx + 1}: rows={n} cumulative={total_rows}", flush=True)

    # consolidate
    ts_full = pd.concat(ts_acc, ignore_index=True)
    p_kwh = {p: np.concatenate(p_acc[p]) for p in pontos}
    q_kwh = {p: np.concatenate(q_acc[p]) for p in pontos}

    # 5-min kWh -> MW (× 12 / 1000)
    p_mw = {p: (p_kwh[p] * 12.0) / 1000.0 for p in pontos}
    q_mvar = {p: (q_kwh[p] * 12.0) / 1000.0 for p in pontos}
    s_signed = {}
    for p in pontos:
        mag = np.sqrt(p_mw[p] ** 2 + q_mvar[p] ** 2)
        s_signed[p] = np.copysign(mag, p_kwh[p])

    print(f"[preprocess] timeline: {total_rows} rows · {ts_full.notna().sum()} valid timestamps",
          flush=True)
    return ts_full, p_kwh, q_kwh, p_mw, q_mvar, s_signed, pontos


def write_meta(points, limits_csv, ts_full, p_mw, q_mvar, s_signed, pontos):
    valid_ts = pd.to_datetime(ts_full, errors="coerce").dropna()
    dates = sorted({d.isoformat() for d in valid_ts.dt.date.unique()})

    # acompanhamento: pico (em valor absoluto) de S por ponto
    acomp = []
    extremes_s = {}
    for p in pontos:
        s = s_signed.get(p)
        if s is None or np.all(np.isnan(s)):
            extremes_s[p] = {"Smax": None, "Smin": None}
            inst = (limits_csv.get(p) or {}).get("Instalado")
            acomp.append({
                "ponto": p, "instalado": inst,
                "verificado_value": None, "verificado_sign": None, "percentual": None,
            })
            continue
        smax = float(np.nanmax(s))
        smin = float(np.nanmin(s))
        extremes_s[p] = {"Smax": smax, "Smin": smin}

        if abs(smin) > abs(smax):
            verif, sign = smin, "min"
        else:
            verif, sign = smax, "max"
        inst = (limits_csv.get(p) or {}).get("Instalado")
        pct = (abs(verif) / inst * 100.0) if (inst and inst != 0) else None
        acomp.append({
            "ponto": p,
            "instalado": round_or_none(inst, 2),
            "verificado_value": round_or_none(verif, 3),
            "verificado_sign": sign,
            "percentual": round_or_none(pct, 2),
        })

    # also compute Soma Total extremes
    P_arr = np.vstack([p_mw[p] for p in pontos])
    S_arr = np.vstack([s_signed[p] for p in pontos])
    soma_p = np.nansum(P_arr, axis=0)
    soma_p[np.all(np.isnan(P_arr), axis=0)] = np.nan
    soma_s = np.nansum(S_arr, axis=0)
    soma_s[np.all(np.isnan(S_arr), axis=0)] = np.nan
    if np.any(~np.isnan(soma_s)):
        extremes_s["Soma Total"] = {
            "Smax": float(np.nanmax(soma_s)),
            "Smin": float(np.nanmin(soma_s)),
        }

    # merge limits with extremes
    merged_limits = {}
    keys = set(limits_csv.keys()) | set(extremes_s.keys())
    for k in keys:
        l = limits_csv.get(k, {})
        e = extremes_s.get(k, {})
        merged_limits[k] = {
            "Pmax": round_or_none(l.get("Pmax"), 3),
            "Pmin": round_or_none(l.get("Pmin"), 3),
            "Qmax": round_or_none(l.get("Qmax"), 3),
            "Qmin": round_or_none(l.get("Qmin"), 3),
            "Smax": round_or_none(l.get("Smax") or e.get("Smax"), 3),
            "Smin": round_or_none(l.get("Smin") or e.get("Smin"), 3),
            "MUSTP": round_or_none(l.get("MUSTP"), 3),
            "MUSTFP": round_or_none(l.get("MUSTFP"), 3),
            "Instalado": round_or_none(l.get("Instalado"), 3),
        }

    total_inst = sum((v.get("Instalado") or 0) for v in limits_csv.values())
    total_verif = sum(
        abs(r["verificado_value"]) for r in acomp if r["verificado_value"] is not None
    )

    meta = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "points": points,
        "limits": merged_limits,
        "dates": dates,
        "acompanhamento": acomp,
        "totals": {
            "instalado": round_or_none(total_inst, 3),
            "verificado": round_or_none(total_verif, 3),
        },
    }
    (OUT_DIR / "meta.json").write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
    print(f"[preprocess] wrote meta.json · {len(dates)} dates", flush=True)
    return dates


def write_series(ts_full, p_mw, q_mvar, s_signed, pontos):
    SERIES_DIR.mkdir(parents=True, exist_ok=True)
    ts = pd.to_datetime(ts_full, errors="coerce")
    valid = ~ts.isna()

    by_date = defaultdict(list)  # date_iso -> list of (label, idx)
    for i, t in enumerate(ts):
        if pd.isna(t):
            continue
        by_date[t.date().isoformat()].append((t.strftime("%H:%M"), i))

    for date_iso, items in by_date.items():
        items.sort()  # stable by time
        labels = [lbl for lbl, _ in items]
        idxs = np.array([i for _, i in items], dtype=np.int64)
        day = {"date": date_iso, "labels": labels, "points": {}}
        for p in pontos:
            P = p_mw[p][idxs]
            Q = q_mvar[p][idxs]
            S = s_signed[p][idxs]
            day["points"][p] = {
                "P": [None if np.isnan(v) else round(float(v), 3) for v in P],
                "Q": [None if np.isnan(v) else round(float(v), 3) for v in Q],
                "S": [None if np.isnan(v) else round(float(v), 3) for v in S],
            }
        out_path = SERIES_DIR / f"{date_iso}.json"
        out_path.write_text(json.dumps(day, separators=(",", ":")), encoding="utf-8")
    print(f"[preprocess] wrote {len(by_date)} series files to {SERIES_DIR}", flush=True)


def write_must(ts_full, p_kwh, limits_csv, pontos):
    """15-min windows = 3 consecutive 5-min rows. value_mw = (kWh_15min * 1000) / 4
    matches the original app.py formula. Ponta = weekday 18:30–21:30."""
    ts = pd.to_datetime(ts_full, errors="coerce")
    n = len(ts)
    out = {p: [] for p in pontos}
    out["Soma Total"] = []
    if n < 3:
        (OUT_DIR / "must.json").write_text(json.dumps(out), encoding="utf-8")
        return

    pontos_with_must = [p for p in pontos
                       if (limits_csv.get(p, {}).get("MUSTP") is not None
                           or limits_csv.get(p, {}).get("MUSTFP") is not None)]

    # stack into 2D: rows = ts, cols = ponto
    p_arr = np.vstack([p_kwh[p] for p in pontos]).T  # (n, P)
    soma_arr = np.nansum(p_arr, axis=1)
    soma_arr[np.all(np.isnan(p_arr), axis=1)] = np.nan

    for i in range(n - 2):
        t = ts.iloc[i + 2]
        if pd.isna(t):
            continue
        is_weekday = t.weekday() <= 4
        tod = t.time()
        is_ponta = (is_weekday and
                    tod >= datetime.strptime("18:30", "%H:%M").time() and
                    tod <= datetime.strptime("21:30", "%H:%M").time())

        sum15 = p_arr[i] + p_arr[i + 1] + p_arr[i + 2]  # kWh in 15min per ponto
        must_mw = (sum15 * 1000.0) / 4.0
        ts_str = t.strftime("%Y-%m-%d %H:%M")

        for col_idx, p in enumerate(pontos):
            v = must_mw[col_idx]
            if np.isnan(v):
                continue
            lim = limits_csv.get(p, {})
            thr = lim.get("MUSTP") if is_ponta else lim.get("MUSTFP")
            thr_type = "MUSTP" if is_ponta else "MUSTFP"
            if thr is None:
                continue
            if v > thr:
                out[p].append({
                    "ts": ts_str,
                    "value_mw": round(float(v), 3),
                    "type": thr_type,
                    "threshold": float(thr),
                })

        soma_lim = limits_csv.get("Soma Total", {})
        soma_thr = soma_lim.get("MUSTP") if is_ponta else soma_lim.get("MUSTFP")
        if soma_thr is not None:
            soma_kwh = soma_arr[i] + soma_arr[i + 1] + soma_arr[i + 2]
            soma_mw = (soma_kwh * 1000.0) / 4.0
            if not np.isnan(soma_mw) and soma_mw > soma_thr:
                out["Soma Total"].append({
                    "ts": ts_str,
                    "value_mw": round(float(soma_mw), 3),
                    "type": "MUSTP" if is_ponta else "MUSTFP",
                    "threshold": float(soma_thr),
                })

    # sort newest first
    for k in out:
        out[k].sort(key=lambda e: e["ts"], reverse=True)
    (OUT_DIR / "must.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    n_events = sum(len(v) for v in out.values())
    print(f"[preprocess] wrote must.json · {n_events} events total", flush=True)


def write_extremos(ts_full, p_mw, s_signed, pontos):
    ts = pd.to_datetime(ts_full, errors="coerce")
    out = {}

    def top_n(values, ts_arr, n, largest):
        # filter NaN
        mask = ~np.isnan(values) & ~ts_arr.isna()
        valid_vals = values[mask.values if hasattr(mask, "values") else mask]
        valid_ts = ts_arr[mask.values if hasattr(mask, "values") else mask]
        if len(valid_vals) == 0:
            return []
        order = np.argsort(valid_vals)
        if largest:
            order = order[-n:][::-1]
        else:
            order = order[:n]
        return [
            {
                "value": round(float(valid_vals[i]), 3),
                "ts": pd.Timestamp(valid_ts.iloc[i]).strftime("%Y-%m-%d %H:%M"),
                "year": int(pd.Timestamp(valid_ts.iloc[i]).year),
            }
            for i in order
        ]

    for p in pontos:
        out[p] = {
            "Pmax_top": top_n(p_mw[p], ts, TOP_N, True),
            "Pmin_top": top_n(p_mw[p], ts, TOP_N, False),
            "Smax_top": top_n(s_signed[p], ts, TOP_N, True),
            "Smin_top": top_n(s_signed[p], ts, TOP_N, False),
        }
    # Soma Total
    P_arr = np.vstack([p_mw[p] for p in pontos])
    S_arr = np.vstack([s_signed[p] for p in pontos])
    soma_p = np.nansum(P_arr, axis=0)
    soma_p[np.all(np.isnan(P_arr), axis=0)] = np.nan
    soma_s = np.nansum(S_arr, axis=0)
    soma_s[np.all(np.isnan(S_arr), axis=0)] = np.nan
    out["Soma Total"] = {
        "Pmax_top": top_n(soma_p, ts, TOP_N, True),
        "Pmin_top": top_n(soma_p, ts, TOP_N, False),
        "Smax_top": top_n(soma_s, ts, TOP_N, True),
        "Smin_top": top_n(soma_s, ts, TOP_N, False),
    }
    (OUT_DIR / "extremos.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"[preprocess] wrote extremos.json · top {TOP_N} per ponto", flush=True)


def write_rao(ts_full, p_kwh, q_kwh, pontos):
    """RAO: groupby (ponto, hora_ref=ceil(ts, 'H')); P_MW = sum(P_kWh)/1000; Q likewise.
    Hourly FP, faixa válida = P_MW > 5; dentro_faixa = -1 ≤ FP ≤ -0.95."""
    ts = pd.to_datetime(ts_full, errors="coerce")
    valid_mask = ~ts.isna()
    if valid_mask.sum() == 0:
        (OUT_DIR / "rao.json").write_text("{}", encoding="utf-8")
        return

    # build long-form per ponto
    out: dict = {}
    ts_valid = ts[valid_mask]
    hora_ref = ts_valid.dt.ceil("h")  # one entry per timestamp

    # determine years available
    years = sorted({int(t.year) for t in ts_valid})
    semesters = []
    for y in years:
        semesters.append((y, "may_oct"))
        semesters.append((y, "nov_apr"))

    for year, sem in semesters:
        if sem == "may_oct":
            start = pd.Timestamp(year=year, month=5, day=1)
            end = pd.Timestamp(year=year, month=10, day=31, hour=23, minute=59, second=59)
        else:
            start = pd.Timestamp(year=year - 1, month=11, day=1)
            end = pd.Timestamp(year=year, month=4, day=30, hour=23, minute=59, second=59)

        period_mask = (ts_valid >= start) & (ts_valid <= end)
        if period_mask.sum() == 0:
            continue

        period_idx = ts_valid.index[period_mask]
        period_hora = hora_ref[period_mask]

        rows = []
        totais = {"total": 0, "validas": 0, "invalidas": 0,
                  "indutivo": 0, "capacitivo": 0}
        for p in pontos:
            P = p_kwh[p][period_idx.to_numpy()]
            Q = q_kwh[p][period_idx.to_numpy()]
            df = pd.DataFrame({"hora_ref": period_hora.values, "P": P, "Q": Q})
            agg = df.groupby("hora_ref", as_index=False).agg({"P": "sum", "Q": "sum"})
            agg["P_MW"] = agg["P"] / 1000.0
            agg["Q_MW"] = agg["Q"] / 1000.0
            denom = np.sqrt(agg["P_MW"] ** 2 + agg["Q_MW"] ** 2)
            sign_q = np.where(agg["Q_MW"] >= 0.0, 1.0, -1.0)
            with np.errstate(divide="ignore", invalid="ignore"):
                fp = np.where(denom > 0.0, -sign_q * (np.abs(agg["P_MW"]) / denom), 0.0)
            agg["FP"] = fp
            agg["valida"] = agg["P_MW"] > 5.0

            total = len(agg)
            validas = int(agg["valida"].sum())
            invalidas = total - validas
            inv = agg[~agg["valida"]]
            reverso = int((inv["P_MW"] < 0).sum())
            desligado = int(((inv["P_MW"] >= 0) & (inv["P_MW"] <= 5.0)).sum())

            g = agg[agg["valida"]]
            ind = int((g["FP"] > 0).sum())
            cap = int((g["FP"] < 0).sum())
            dentro_mask = (g["FP"] >= -1.0) & (g["FP"] <= -0.95)
            dentro_count = int(dentro_mask.sum())
            fora_count = validas - dentro_count
            dentro_pct = round((dentro_count / total) * 100.0, 2) if total else None
            fora_pct = round((fora_count / total) * 100.0, 2) if total else None

            rows.append({
                "ponto": p, "total": total, "validas": validas, "invalidas": invalidas,
                "reverso": reverso, "desligado": desligado,
                "dentro_count": dentro_count, "dentro_pct": dentro_pct,
                "fora_count": fora_count, "fora_pct": fora_pct,
                "ind": ind, "cap": cap,
            })
            totais["total"] += total
            totais["validas"] += validas
            totais["invalidas"] += invalidas
            totais["indutivo"] += ind
            totais["capacitivo"] += cap

        out[f"{year}_{sem}"] = {
            "rows": sorted(rows, key=lambda r: r["ponto"].lower()),
            "totais": totais,
            "year": year, "semester": sem,
        }

    (OUT_DIR / "rao.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"[preprocess] wrote rao.json · {len(out)} (year, semester) buckets", flush=True)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SERIES_DIR.mkdir(parents=True, exist_ok=True)

    if not DEMANDAS.exists():
        print(f"[preprocess] {DEMANDAS} not found — aborting", flush=True)
        sys.exit(2)

    points = load_points()
    limits_csv = load_limits()
    print(f"[preprocess] {len(points)} pontos · {len(limits_csv)} limites", flush=True)

    ts_full, p_kwh, q_kwh, p_mw, q_mvar, s_signed, pontos = process_csv()

    write_meta(points, limits_csv, ts_full, p_mw, q_mvar, s_signed, pontos)
    write_series(ts_full, p_mw, q_mvar, s_signed, pontos)
    write_must(ts_full, p_kwh, limits_csv, pontos)
    write_extremos(ts_full, p_mw, s_signed, pontos)
    write_rao(ts_full, p_kwh, q_kwh, pontos)

    print("[preprocess] done", flush=True)


if __name__ == "__main__":
    main()

# Rede Básica · Demandas — MT

Dashboard estático (HTML + React via Babel-standalone) servido pelo GitHub Pages, com pipeline de preprocessamento dos dados em GitHub Actions.

## Como atualizar os dados

O `demandas.csv` (≈500 MB) **não** vai pro git. Ele fica como asset de um release.

1. No GitHub, vá em **Releases** → "Draft a new release"
2. Tag: `data-latest` (use a mesma sempre — sobrescrever é o fluxo de atualização)
3. Anexe o `demandas.csv`
4. Publique. Isso dispara o workflow `Deploy to GitHub Pages` automaticamente.

Workflow (`.github/workflows/pages.yml`):
1. Baixa `demandas.csv` do release `data-latest`
2. Roda `scripts/preprocess.py` (~5–15 min, depende do tamanho)
3. Gera `data/meta.json`, `data/series/<dia>.json`, `data/must.json`, `data/extremos.json`, `data/rao.json`
4. Faz upload do site (sem o CSV bruto) e deploya

Sem release, o site sobe com **dados de exemplo** e mostra um banner avisando.

### Atualizar os limites ou pontos

Edite `csv/limites.csv` ou `csv/points.csv` no repo e dê push. Esses arquivos são pequenos e ficam versionados.

## Estrutura

```
index.html, *.jsx, styles.css   ← site estático
data.js                         ← loader assíncrono (real ou mock)
csv/                            ← inputs versionados (limites, points)
scripts/preprocess.py           ← roda no CI; gera os JSONs
data/                           ← saída (NÃO commitada — gerada pelo CI)
.github/workflows/pages.yml     ← orquestração
```

## Rodando local (opcional)

Se quiser testar o site local com os dados de exemplo, basta abrir `index.html` num servidor estático (ex.: `python -m http.server 8000`).

Pra testar com dados reais local, baixe o CSV e rode `python scripts/preprocess.py` (precisa de Python 3.11 + `pip install -r scripts/requirements.txt`).

## Tweaks

Tema (claro/escuro), densidade (confortável/compacta), tipografia (sans/serif/mono), hue de destaque, mostrar/ocultar mapa.

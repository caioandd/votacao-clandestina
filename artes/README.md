# Artes do feed · 3ª Copa Clandestina

Artes **4:5 (1080×1350)** para o feed do Instagram, na identidade visual do site
(tinta `#0e0e10`, ouro `#f6c400`, placa branca do escudo com filete dourado,
Anton nos títulos e Inter no texto). Cada `.frame` é um quadro 1080×1350 —
exceto a `05-campeao.html`, que é a peça de 6,5×6,5 cm para a base do troféu
(768×768 = 6,5 cm a 300 dpi).

| Arquivo | Quadros | Para quê |
| --- | --- | --- |
| `01-anuncio.html` | 1 | Anúncio da 3ª Copa (28/11, 8h, IFBA) com QR da tabela |
| `02-times.html` | 7 | Carrossel: capa + um quadro por time, com integrantes e jogos |
| `03-chaveamento.html` | 1 | Grupos e chave: semifinais cruzadas, final e 3º lugar com QR |
| `04-confrontos.html` | 1 | Os três jogos de cada grupo, na ordem divulgada, com QR |
| `05-campeao.html` | 2 | Arte do campeão para a base do troféu: versão escura e clara |

Os integrantes e os jogos seguem a divisão oficial (mesma da página `/copa`).
O QR aponta para `https://caioandd.github.io/votacao-clandestina/copa`.

## Ver na tela

```bash
npm run dev            # servidor local
# abra http://localhost:5180/artes/01-anuncio.html
```

## Exportar os PNGs (1080×1350)

Com o servidor local no ar, capture cada quadro pelo `scripts/shoot-app.mjs`:

```bash
node scripts/shoot-app.mjs --url /artes/01-anuncio.html   --w 1080 --h 1350 --clip "#anuncio"     --out artes/export/01-anuncio.png
node scripts/shoot-app.mjs --url /artes/02-times.html     --w 1080 --h 1350 --clip "#capa"        --out artes/export/02-times-1-capa.png
node scripts/shoot-app.mjs --url /artes/02-times.html     --w 1080 --h 1350 --clip "#time-1"      --out artes/export/02-times-2-time1.png
node scripts/shoot-app.mjs --url /artes/02-times.html     --w 1080 --h 1350 --clip "#time-2"      --out artes/export/02-times-3-time2.png
node scripts/shoot-app.mjs --url /artes/02-times.html     --w 1080 --h 1350 --clip "#time-3"      --out artes/export/02-times-4-time3.png
node scripts/shoot-app.mjs --url /artes/02-times.html     --w 1080 --h 1350 --clip "#time-4"      --out artes/export/02-times-5-time4.png
node scripts/shoot-app.mjs --url /artes/02-times.html     --w 1080 --h 1350 --clip "#time-5"      --out artes/export/02-times-6-time5.png
node scripts/shoot-app.mjs --url /artes/02-times.html     --w 1080 --h 1350 --clip "#time-6"      --out artes/export/02-times-7-time6.png
node scripts/shoot-app.mjs --url /artes/03-chaveamento.html --w 1080 --h 1350 --clip "#chaveamento" --out artes/export/03-chaveamento.png
node scripts/shoot-app.mjs --url /artes/04-confrontos.html  --w 1080 --h 1350 --clip "#confrontos"  --out artes/export/04-confrontos.png
```

## Exportar a arte do campeão (6,5×6,5 cm)

Peça de impressão para a base do troféu — não vai para o feed. Gere as duas
versões em 300 dpi e 600 dpi e carimbe o DPI no PNG:

```bash
node scripts/shoot-app.mjs --url /artes/05-campeao.html --w 768 --h 768 --clip "#campeao-escuro" --out artes/export/05-campeao-escuro-300dpi.png
node scripts/shoot-app.mjs --url /artes/05-campeao.html --w 768 --h 768 --clip "#campeao-claro"  --out artes/export/05-campeao-claro-300dpi.png
node scripts/shoot-app.mjs --url /artes/05-campeao.html --w 768 --h 768 --dsf 2 --clip "#campeao-escuro" --out artes/export/05-campeao-escuro-600dpi.png
node scripts/shoot-app.mjs --url /artes/05-campeao.html --w 768 --h 768 --dsf 2 --clip "#campeao-claro"  --out artes/export/05-campeao-claro-600dpi.png
node scripts/png-dpi.mjs artes/export/05-campeao-escuro-300dpi.png 300
node scripts/png-dpi.mjs artes/export/05-campeao-claro-300dpi.png 300
node scripts/png-dpi.mjs artes/export/05-campeao-escuro-600dpi.png 600
node scripts/png-dpi.mjs artes/export/05-campeao-claro-600dpi.png 600
```

> O `png-dpi.mjs` grava o chunk `pHYs` para o arquivo imprimir em 6,5×6,5 cm
> em programas que respeitam o DPI (Word, PowerPoint, Canva…). Na dúvida, peça
> a impressão em 6,5×6,5 cm e confira com a régua antes de recortar.

> A pasta `artes/` fica fora de `public/`: é material de publicação, não vai
> para o build do site. Os PNGs exportados ficam em `artes/export/`.

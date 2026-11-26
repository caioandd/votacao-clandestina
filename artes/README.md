# Artes do feed · 3ª Copa Clandestina

Artes **4:5 (1080×1350)** para o feed do Instagram, na identidade visual do site
(tinta `#0e0e10`, ouro `#f6c400`, placa branca do escudo com filete dourado,
Anton nos títulos e Inter no texto). Cada `.frame` é um quadro 1080×1350.

| Arquivo | Quadros | Para quê |
| --- | --- | --- |
| `01-anuncio.html` | 1 | Anúncio da 3ª Copa (28/11, 8h, IFBA) com QR da tabela |
| `02-times.html` | 7 | Carrossel: capa + um quadro por time, com integrantes e jogos |
| `03-chaveamento.html` | 1 | Grupos e chave: semifinais cruzadas, final e 3º lugar com QR |
| `04-confrontos.html` | 1 | Os três jogos de cada grupo, na ordem divulgada, com QR |

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

> A pasta `artes/` fica fora de `public/`: é material de publicação, não vai
> para o build do site. Os PNGs exportados ficam em `artes/export/`.

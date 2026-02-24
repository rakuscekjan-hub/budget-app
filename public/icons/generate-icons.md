# PWA Icon generatie

Maak 2 PNG-bestanden aan in deze map:
- `icon-192.png` (192×192 px)
- `icon-512.png` (512×512 px)

## Snelle optie: gebruik de online tool
Ga naar https://favicon.io/favicon-generator/ of https://realfavicongenerator.net/
Gebruik tekst "💰" op indigo (#6366f1) achtergrond.

## Of via terminal (vereist ImageMagick):
```bash
# Installeer ImageMagick
brew install imagemagick

# Genereer icons
convert -size 192x192 xc:#6366f1 -fill white -font Arial -pointsize 96 \
  -gravity center -annotate 0 '💰' public/icons/icon-192.png

convert -size 512x512 xc:#6366f1 -fill white -font Arial -pointsize 256 \
  -gravity center -annotate 0 '💰' public/icons/icon-512.png
```

## Of via Node.js (na npm install):
Voeg tijdelijk toe aan package.json scripts:
```
"generate-icons": "node scripts/generate-icons.js"
```

De app werkt ook zonder icons — de manifest-vermelding zorgt dat browsers
de app installeerbaar tonen zodra de images beschikbaar zijn.

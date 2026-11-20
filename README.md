# Font Inspect

Extension Firefox pour inspecter la police d'un texte au clic.

## Utilisation

1. Cliquer sur l'icône **Font Inspect** dans la barre d'outils (ou `Alt+Shift+F`).
2. Survoler la page : l'élément sous le curseur est surligné.
3. Cliquer sur un texte : un panneau affiche
   - `font-family`
   - `font-size` (px + équivalent rem)
   - `font-weight` (valeur + nom : Regular, Bold…)
   - `line-height` (px + ratio sans unité)
   - `letter-spacing` (px + équivalent em)
   - `color` : valeur telle que définie dans le CSS (hexa, rgba, hsl, oklch, var()…), règle d'origine, valeur résolue des `var()`, et conversion **hexa** systématique (`#rrggbbaa` si transparence)
4. Cliquer sur une valeur pour la copier.
5. `Échap` ou nouveau clic sur l'icône pour quitter.

## Installation en développement

1. Ouvrir `about:debugging#/runtime/this-firefox`
2. **Charger un module complémentaire temporaire…**
3. Sélectionner `manifest.json`

Ou avec [web-ext](https://github.com/mozilla/web-ext) :

```bash
npx web-ext run
```

## Structure

- `manifest.json` — Manifest V3
- `background.js` — injecte le script au clic sur l'icône, gère le badge « ON »
- `content.js` — surbrillance, capture du clic, panneau (Shadow DOM isolé du CSS de la page)
- `icons/icon.svg`
- `test/colors.html` — page de test des différents formats de couleur

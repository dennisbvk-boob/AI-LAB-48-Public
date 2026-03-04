# EV Verdict (Public)

Publieke website voor het vergelijken van elektrische auto's op basis van:

- gecombineerde reviews van YouTube, Carwow, Autoweek, Autoblog, TopGear en EVbase;
- EV-specificaties (prijs, range, acceleratie, laadvermogen, bagageruimte);
- persoonlijke matchscore op basis van gewichten.

## Live via GitHub Pages

Verwachte URL:

`https://dennisbvk-boob.github.io/AI-LAB-48-Public/`

## Inhoud

- `index.html` - hoofdpagina
- `styles.css` - styling en responsive layout
- `script.js` - filters, sortering en matchscorelogica
- `data/evData.js` - geaggregeerde EV-dataset met reviewbronnen
- `ev-aggregator-project-brief.md` - korte projectbrief

## Functionaliteit

- **Filters**
  - zoek op model/merk
  - body type
  - reviewbron
  - maximale prijs
  - minimale range
- **Sortering**
  - beste match
  - expert score
  - prijs
  - range
  - acceleratie (0-100)
- **Persoonlijke matchscore**
  - value for money
  - range
  - performance
  - practicality
  - comfort

## Lokaal draaien

Open `index.html` direct in de browser, of start een simpele server:

```bash
python3 -m http.server 8080
```

Ga daarna naar `http://localhost:8080`.

## EV-Database dataset opnieuw genereren

De EV-lijst in `data/evData.js` kan volledig worden vernieuwd met:

```bash
node scripts/refreshEvDataFromEvDatabase.mjs
```

Wat dit script doet:

- haalt de actuele EV-Database lijst op vanaf `https://ev-database.org/`;
- neemt alle modellen met status `current` en `upcoming` mee;
- bouwt een consistente `window.evData` dataset opnieuw op (incl. EVbase source-link per auto).

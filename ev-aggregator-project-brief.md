# EV Aggregator Project Brief

## Project

**Naam:** EV Verdict  
**Doel:** een toegankelijke webpagina die reviewdata en specificaties van
elektrische auto's combineert, zodat gebruikers sneller een passende EV kunnen
vinden.

## Kernidee

In plaats van losse reviews op meerdere websites te doorzoeken, brengt EV
Verdict bronnen zoals YouTube, Carwow, Autoweek, Autoblog, TopGear en EVbase
samen in een overzichtelijke vergelijkingspagina.

## Gebruikerswaarde

- Snel vergelijken van meerdere EV's.
- Persoonlijke prioriteiten vertalen naar een matchscore.
- Transparantie over herkomst van reviews per model.

## Datasetinhoud

Per auto worden zowel specificaties als reviewverwijzingen bijgehouden:

- merk, model, bouwjaar, body type
- prijs, range, acceleratie, kofferbakvolume, laadvermogen
- geaggregeerde expertscore + comfortscore
- reviewbronnen met links en bronrating

## MVP-functionaliteit

1. Filteren op zoekterm, body type, reviewbron, max prijs en min range.
2. Sorteren op beste match, expertscore, prijs, range en acceleratie.
3. Matchscore op basis van gewichten:
   - value for money
   - range
   - performance
   - practicality
   - comfort
4. Kaarten per auto met belangrijkste specs en externe reviewlinks.

## Publicatie

De website is bedoeld voor publicatie via GitHub Pages met `index.html` in de
repo-root.
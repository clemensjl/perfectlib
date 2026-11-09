# Mitmachen

PerfectLib ist die gemeinsame Element-Sammlung von Clemens, Philipp und Raphael. Beiträge von außen sind willkommen: neue Elemente, Fehlerkorrekturen und Verbesserungen an Seite und Registry.

## Setup

1. Repo forken und klonen.
2. `npm install`
3. `npm run dev` startet die Seite auf http://localhost:3000.

## Prüfen

Vor jedem PR müssen beide Befehle durchlaufen:

```bash
npm run lint
npm run build   # baut public/r/*.json und die Seite
```

Dieselben Schritte laufen in der CI.

## Neues Element

Der Ablauf steht im Abschnitt "Ein neues Element hinzufügen" der [README](README.md): Ordner in `registry/`, Eintrag in `registry.json`, Import in `registry/previews.tsx`. Wichtig ist die White-Label-Regel: Farben, Radius und Schrift nur über `--pl-*`-Variablen, dazu der `PERFECTLIB`-Kommentar oben in der Datei.

## Pull Request

1. Branch vom aktuellen `main` anlegen, eine Änderung pro PR.
2. Kurz beschreiben, was sich ändert und warum. Bei sichtbaren Änderungen einen Screenshot anhängen.
3. PR gegen `main` öffnen. `main` wird bei Vercel automatisch deployt, deshalb wird nur gemergt, wenn die CI grün ist.

Mit dem Beitrag stimmst du zu, dass er unter der [MIT-Lizenz](LICENSE) des Repos steht.

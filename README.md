# PerfectLib

Die UI-Elemente von Clemens, Philipp und Raphael: Buttons, Animationen, Login-Screens und alles andere, das wir in jedem Projekt wieder verwenden wollen.

Live: https://perfectlib.vercel.app

## Ein Element ins eigene Projekt holen

Jedes Element ist ein Eintrag in einer [shadcn-Registry](https://ui.shadcn.com/docs/registry). In einem React-Projekt mit Tailwind:

```bash
npx shadcn@latest add https://perfectlib.vercel.app/r/<name>.json
```

Der Code landet als normale Datei im Projekt und gehört ab dann dem Projekt.

## Ein neues Element hinzufügen

1. Ordner `registry/<name>/` anlegen und die Komponente hineinlegen, z. B. `registry/login-clemens/login-clemens.tsx`. Die Komponente exportiert sich als `default`.
2. Eintrag in `registry.json` unter `items` ergänzen:
   ```json
   {
     "name": "login-clemens",
     "type": "registry:block",
     "title": "Login-Screen",
     "description": "Ein Satz, was es ist.",
     "author": "Clemens",
     "categories": ["auth"],
     "files": [{ "path": "registry/login-clemens/login-clemens.tsx", "type": "registry:component" }]
   }
   ```
   `author` ist `Clemens`, `Philipp` oder `Raphael`, daraus kommt die Farbe auf der Seite. Braucht das Element npm-Pakete, gehören sie nach `dependencies` im Eintrag.
3. In `registry/previews.tsx` die Komponente importieren und unter demselben `name` eintragen, damit die Seite sie live zeigt.
4. White Label einhalten: Farben, Radius und Schrift nur über `--pl-*`-Variablen mit Standardwerten in einem `:where(:root)`-Block (Vorbild: `registry/login-clemens`). Oben in die Datei kommt ein `PERFECTLIB`-Kommentar mit den Abschnitten ANPASSEN und NICHT ÄNDERN. Dieser Kommentar ist die Übergabe an jede Claude-Session, die das Element später in ein Projekt holt.
5. `npm run build` lokal laufen lassen, dann pushen. Vercel deployt `main` automatisch.

## Ein Element in einem Projekt übernehmen

Auf der Detailseite jedes Elements steht unter "An dein Design anpassen" ein fertiger Auftrag für Claude zum Kopieren. Kurzfassung: installieren, den `PERFECTLIB`-Kommentar oben in der Datei befolgen, `--pl-*`-Variablen auf die Design-Tokens des Projekts mappen. Für Assistenten gibt es eine Übersicht unter https://perfectlib.vercel.app/llms.txt.

## Entwicklung

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # baut public/r/*.json und die Seite
```

## Mitmachen

Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

[MIT](LICENSE)

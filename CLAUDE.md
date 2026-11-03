@AGENTS.md

# PerfectLib

Gemeinsame UI-Element-Library von Clemens, Philipp (GitHub `Pholippo`) und Raphael. Repo `clemensjl/perfectlib`, live auf https://perfectlib.vercel.app, `main` deployt automatisch über Vercel.

- Next.js 16 (App Router) + Tailwind v4, die Seite ist komplett statisch.
- `registry.json` ist die einzige Quelle für die Elementliste. `npm run build` ruft erst `shadcn build` (erzeugt `public/r/*.json`, nicht eingecheckt), dann `next build`.
- Neues Element: Ablauf steht im README (Ordner in `registry/`, Eintrag in `registry.json`, Import in `registry/previews.tsx`).
- Jedes Element ist White Label: Farben/Radius/Schrift nur über `--pl-*`-Variablen (Standardwerte in `:where(:root)`, Spezifität 0), oben ein `PERFECTLIB`-Kommentar mit ANPASSEN / NICHT ÄNDERN. Die Detailseite liest die Variablen per Regex `^--pl-x:wert;$` aus dem Quelltext, also eine Variable pro Zeile.
- `/llms.txt` listet alle Elemente für Assistenten, generiert aus `registry.json`.
- `cacheComponents` ist bewusst aus: mit leerer oder kleiner Registry bricht sonst `generateStaticParams` den Build.
- Vorschauen laufen in einem iframe auf `/preview/<name>` ohne Site-Layout, damit Vollbild-Elemente (Login-Screens) sauber rendern.
- Design-Tokens in `app/globals.css`: kühles Papiergrau, Macher-Farben `--maker-clemens|philipp|raphael`. Schrift Schibsted Grotesk, Mono nur für Code.

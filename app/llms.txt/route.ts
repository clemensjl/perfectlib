import { installCommand, items, SITE_URL } from "@/lib/registry";

export const dynamic = "force-static";

// Einstieg für KI-Assistenten: welche Elemente es gibt und wie man sie übernimmt.
export function GET() {
  const lines = [
    "# PerfectLib",
    "",
    "> UI-Element-Library von Clemens, Philipp und Raphael. Jedes Element ist White Label: Aussehen anpassbar, Verhalten fest.",
    "",
    "## So übernimmst du ein Element",
    "",
    "1. Im Zielprojekt (React + Tailwind) installieren: npx shadcn@latest add <url>",
    "2. Den PERFECTLIB-Kommentar oben in der installierten Datei lesen. Er sagt, was angepasst werden darf und was nicht.",
    "3. Theme-Variablen (--pl-*) im globalen CSS auf die Design-Tokens des Projekts mappen, Props und Handler setzen.",
    "4. Ablauf, Validierung, Animationen und Layout nicht verändern, ohne den Menschen zu fragen.",
    "",
    "## Elemente",
    "",
    ...items.map(
      (i) => `- [${i.title}](${SITE_URL}/e/${i.name}): ${i.description ?? ""} Installieren: \`${installCommand(i.name)}\``,
    ),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

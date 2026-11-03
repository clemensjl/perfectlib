import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { handoffPrompt, installCommand, items, makerOf, makers } from "@/lib/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return items.map((item) => ({ name: item.name }));
}

export default async function ElementPage({ params }: PageProps<"/e/[name]">) {
  const { name } = await params;
  const item = items.find((i) => i.name === name);
  if (!item) notFound();

  const maker = makerOf(item);
  const color = maker ? makers[maker].color : "var(--line)";
  const command = installCommand(item.name);
  const files = await Promise.all(
    item.files.map(async (f) => ({
      path: f.path,
      source: await readFile(
        path.join(process.cwd(), "registry", f.path.replace(/^registry\//, "")),
        "utf8",
      ),
    })),
  );
  const themeVars = files.flatMap((f) =>
    [...f.source.matchAll(/^(--pl-[a-z-]+):([^;]+);$/gm)].map((m) => ({ name: m[1], value: m[2] })),
  );
  const prompt = handoffPrompt(item.title, command);

  return (
    <article>
      <Link href="/" className="text-sm text-muted hover:text-ink">
        Alle Elemente
      </Link>

      <header className="mt-6 grid grid-cols-[6px_1fr] gap-x-5">
        <span aria-hidden className="rounded-full" style={{ background: color }} />
        <div>
          <h1 className="text-4xl font-extrabold tracking-[-0.03em] sm:text-6xl">
            {item.title}
          </h1>
          <p className="mt-2 max-w-prose text-muted">
            {item.description}
            {item.description && " "}
            Gebaut von {maker ? makers[maker].name : item.author}.
          </p>
        </div>
      </header>

      <section aria-label="Vorschau" className="mt-10">
        <div className="overflow-hidden rounded-xl border border-line bg-stage">
          <iframe
            src={`/preview/${item.name}`}
            title={`Vorschau: ${item.title}`}
            className="block h-[760px] w-full"
          />
        </div>
        <a
          href={`/preview/${item.name}`}
          target="_blank"
          className="mt-3 inline-block text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Vorschau im eigenen Tab öffnen
        </a>
      </section>

      <section aria-labelledby="install" className="mt-14">
        <h2 id="install" className="text-xl font-semibold tracking-tight">
          Ins Projekt holen
        </h2>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-stage p-3 pl-4">
          <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap">
            {command}
          </code>
          <CopyButton text={command} />
        </div>
      </section>

      <section aria-labelledby="adapt" className="mt-14">
        <h2 id="adapt" className="text-xl font-semibold tracking-tight">
          An dein Design anpassen
        </h2>
        <p className="mt-2 max-w-prose text-muted">
          Das Element ist White Label. Farben, Radius und Schrift kommen aus Variablen, der Ablauf bleibt
          gleich. Gib Claude im Zielprojekt diesen Auftrag:
        </p>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-line bg-stage p-4">
          <p className="m-0 min-w-0 flex-1 whitespace-pre-line">{prompt}</p>
          <CopyButton text={prompt} />
        </div>
        {themeVars.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-stage">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Theme-Variablen und Standardwerte</caption>
              <thead className="text-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Variable</th>
                  <th scope="col" className="px-4 py-2 font-medium">Standard</th>
                </tr>
              </thead>
              <tbody>
                {themeVars.map((v) => (
                  <tr key={v.name} className="border-t border-line">
                    <td className="px-4 py-2 font-mono">{v.name}</td>
                    <td className="px-4 py-2 font-mono">{v.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="code" className="mt-14">
        <h2 id="code" className="text-xl font-semibold tracking-tight">
          Code
        </h2>
        {files.map((f) => (
          <div key={f.path} className="mt-3 overflow-hidden rounded-xl border border-line bg-stage">
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
              <span className="truncate font-mono text-sm text-muted">{f.path}</span>
              <CopyButton text={f.source} />
            </div>
            <pre className="max-h-[560px] overflow-auto p-4 font-mono text-[13px] leading-relaxed">
              <code>{f.source}</code>
            </pre>
          </div>
        ))}
      </section>
    </article>
  );
}

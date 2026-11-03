import Link from "next/link";
import { items, makerOf, makers, REPO_URL } from "@/lib/registry";

export default function Home() {
  return (
    <>
      <section className="pt-10 pb-16 sm:pt-16">
        <h1 className="text-[clamp(3.5rem,13vw,9.5rem)] leading-[0.85] font-extrabold tracking-[-0.045em]">
          PerfectLib
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
          Die UI-Elemente, die wir in jedem Projekt wieder verwenden. Jedes
          einzelne so lange geschliffen, bis es passt.
        </p>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {Object.values(makers).map((m) => (
            <li key={m.name} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: m.color }}
              />
              {m.name}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="elemente">
        <h2
          id="elemente"
          className="border-b border-line pb-3 text-sm font-semibold text-muted"
        >
          Elemente ({items.length})
        </h2>

        {items.length === 0 ? (
          <div className="py-16">
            <p className="text-2xl font-semibold tracking-tight">
              Noch leer.
            </p>
            <p className="mt-2 max-w-md text-muted">
              Als Erstes kommt der Login-Screen von Clemens. Wie ein Element
              dazukommt, steht im{" "}
              <a href={REPO_URL} className="underline underline-offset-4">
                README
              </a>
              .
            </p>
          </div>
        ) : (
          <ul>
            {items.map((item) => {
              const maker = makerOf(item);
              return (
                <li key={item.name} className="border-b border-line">
                  <Link
                    href={`/e/${item.name}`}
                    className="group grid grid-cols-[6px_1fr] gap-x-5 py-6 hover:bg-stage sm:grid-cols-[6px_1fr_auto]"
                  >
                    <span
                      aria-hidden
                      className="row-span-2 rounded-full sm:row-span-1"
                      style={{
                        background: maker ? makers[maker].color : "var(--line)",
                      }}
                    />
                    <span>
                      <span className="block text-2xl font-semibold tracking-tight sm:text-3xl">
                        {item.title}
                      </span>
                      {item.description && (
                        <span className="mt-1 block max-w-prose text-muted">
                          {item.description}
                        </span>
                      )}
                    </span>
                    <span className="mt-2 text-sm text-muted sm:mt-0 sm:pr-4 sm:text-right">
                      {maker ? makers[maker].name : item.author}
                      {item.categories?.length ? (
                        <span className="block">{item.categories.join(", ")}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

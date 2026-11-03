"use client";

/**
 * PERFECTLIB: sidebar-clemens (App-Sidebar, von Clemens)
 * Quelle: https://perfectlib.vercel.app/e/sidebar-clemens
 *
 * Dieses Element ist White Label. Beim Einbau in ein Projekt gilt:
 *
 * ANPASSEN (an die Design-Guidelines des Projekts):
 * - Die Theme-Variablen --pl-* (Liste unten in THEME_DEFAULTS). Am besten im globalen CSS
 *   des Projekts auf die vorhandenen Design-Tokens mappen.
 * - Inhalte über Props: workspaces, sections, footer, user, logo. Icons dürfen aus der
 *   Icon-Bibliothek des Projekts kommen (ReactNode).
 * - Navigation anschließen: activeId + onNavigate (z. B. mit dem Router des Projekts) oder href pro Punkt.
 * - Den Seiteninhalt als children übergeben.
 *
 * NICHT ÄNDERN (das ist der Kern des Elements):
 * - Aufbau: Workspace-Umschalter, Suche, Abschnitte mit Gruppen, Fußbereich mit Benutzer.
 * - Suche: filtert live, klappt Gruppen mit Treffern auf, Enter öffnet den ersten Treffer, Strg/Cmd+K fokussiert.
 * - Einklappen auf Icon-Leiste mit Tooltips, Zustand wird gemerkt; auf dem Handy Schublade mit Escape.
 * - Animationen und ihr Verhalten bei prefers-reduced-motion (MOTION_CSS).
 * - Barrierefreiheit: aria-current, aria-expanded, sichtbare Namen auch im eingeklappten Zustand.
 * Wer davon abweichen will, fragt zuerst den Menschen.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type NavItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  badge?: string | number;
  children?: NavItem[];
};
export type NavSection = { id: string; label?: string; items: NavItem[] };
export type Workspace = { id: string; name: string; tag?: string };

type SidebarProps = {
  workspaces?: Workspace[];
  workspaceId?: string;
  onWorkspaceChange?: (id: string) => void;
  sections?: NavSection[];
  footer?: NavItem[];
  activeId?: string;
  onNavigate?: (item: NavItem) => void;
  user?: { name: string; email?: string };
  logo?: ReactNode;
  /** Schlüssel für den gemerkten Einklapp-Zustand im Browser. */
  storageKey?: string;
  children?: ReactNode;
};

// Standardwerte der Theme-Variablen. :where() hat Spezifität 0, deshalb gewinnt jede Definition im Projekt.
const THEME_DEFAULTS = `
:where(:root){
--pl-accent:#2f5bea;
--pl-ink:#15171c;
--pl-muted:#5d6573;
--pl-line:#e2e5ea;
--pl-subtle:#eceff3;
--pl-surface:#ffffff;
--pl-sidebar-bg:#f7f8fa;
--pl-radius:8px;
--pl-font:inherit;
}`;

const MOTION_CSS = `
.pl-sb{transition:width .24s cubic-bezier(.23,1,.32,1)}
.pl-sb-label{transition:opacity .16s ease-out}
.pl-sb-group{grid-template-rows:0fr;transition:grid-template-rows .22s cubic-bezier(.23,1,.32,1)}
.pl-sb-group[data-open=true]{grid-template-rows:1fr}
.pl-sb-chevron{transition:transform .2s cubic-bezier(.23,1,.32,1)}
.pl-sb-tip{opacity:0;transform:translateX(-4px);transition:opacity .12s ease-out,transform .12s ease-out;pointer-events:none}
.pl-sb-tipwrap:hover .pl-sb-tip,.pl-sb-tipwrap:focus-visible .pl-sb-tip{opacity:1;transform:none;transition-delay:.15s}
.pl-sb-drawer{transition:transform .26s cubic-bezier(.32,.72,0,1)}
.pl-sb-scrim{transition:opacity .2s ease-out}
.pl-sb-pop{animation:pl-sb-pop .16s cubic-bezier(.23,1,.32,1) both;transform-origin:top center}
.pl-sb-press{transition:background-color .12s,color .12s,transform .12s cubic-bezier(.23,1,.32,1)}
.pl-sb-press:active{transform:scale(.98)}
@keyframes pl-sb-pop{from{opacity:0;transform:scale(.97) translateY(-4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){
.pl-sb,.pl-sb-group,.pl-sb-chevron,.pl-sb-drawer{transition-duration:.01s}
.pl-sb-tip{transform:none}
.pl-sb-pop{animation-name:pl-sb-fade}
.pl-sb-press:active{transform:none}
@keyframes pl-sb-fade{from{opacity:0}to{opacity:1}}
}`;

const norm = (s: string) => s.toLocaleLowerCase("de").normalize("NFD").replace(/\p{M}/gu, "");

function filterSections(sections: NavSection[], query: string) {
  const q = norm(query.trim());
  if (!q) return sections;
  return sections
    .map((s) => ({
      ...s,
      items: s.items.flatMap((item) => {
        if (norm(item.label).includes(q)) return [item];
        const kids = item.children?.filter((c) => norm(c.label).includes(q));
        return kids?.length ? [{ ...item, children: kids }] : [];
      }),
    }))
    .filter((s) => s.items.length);
}

const firstLeaf = (sections: NavSection[]): NavItem | undefined => {
  for (const s of sections) for (const i of s.items) return i.children?.length ? i.children[0] : i;
};

const containsId = (item: NavItem, id?: string): boolean =>
  item.id === id || !!item.children?.some((c) => containsId(c, id));

export default function SidebarClemens({
  workspaces = DEMO_WORKSPACES,
  workspaceId,
  onWorkspaceChange,
  sections = DEMO_SECTIONS,
  footer = DEMO_FOOTER,
  activeId,
  onNavigate,
  user = { name: "Clemens", email: "clemens@beispiel.at" },
  logo,
  storageKey = "perfectlib:sidebar-collapsed",
  children,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [wsOpen, setWsOpen] = useState(false);
  const [ownWs, setOwnWs] = useState(workspaces[0]?.id);
  const [ownActive, setOwnActive] = useState(firstLeaf(sections)?.id);
  const current = activeId ?? ownActive;
  const wsId = workspaceId ?? ownWs;
  const ws = workspaces.find((w) => w.id === wsId) ?? workspaces[0];

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(sections.flatMap((s) => s.items.filter((i) => i.children && containsId(i, current)).map((i) => i.id))),
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<HTMLDivElement>(null);
  const visible = useMemo(() => filterSections(sections, query), [sections, query]);
  const searching = query.trim().length > 0;

  useEffect(() => {
    try {
      // Gemerkten Zustand erst nach dem Hydrieren übernehmen, damit Server- und Client-HTML gleich bleiben.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(storageKey) === "1") setCollapsed(true);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCollapsed(false);
        setMobileOpen(true);
        requestAnimationFrame(() => searchRef.current?.focus());
      } else if (e.key === "Escape") {
        setMobileOpen(false);
        setWsOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!wsOpen) return;
    const close = (e: PointerEvent) => {
      if (!wsRef.current?.contains(e.target as Node)) setWsOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [wsOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    setWsOpen(false);
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {}
  }

  function navigate(item: NavItem) {
    setOwnActive(item.id);
    onNavigate?.(item);
    setMobileOpen(false);
    setQuery("");
  }

  function toggleGroup(item: NavItem) {
    if (collapsed) {
      setCollapsed(false);
      setOpenGroups((g) => new Set(g).add(item.id));
      return;
    }
    setOpenGroups((g) => {
      const n = new Set(g);
      if (n.has(item.id)) n.delete(item.id);
      else n.add(item.id);
      return n;
    });
  }

  function pickWorkspace(id: string) {
    setOwnWs(id);
    onWorkspaceChange?.(id);
    setWsOpen(false);
  }

  const activeItem = sections.flatMap((s) => s.items.flatMap((i) => [i, ...(i.children ?? [])])).find((i) => i.id === current);
  const activeParent = sections.flatMap((s) => s.items).find((i) => i.children?.some((c) => c.id === current));
  const rail = collapsed; // nur auf dem Desktop wirksam, die Schublade ist immer breit
  const labelCls = `pl-sb-label truncate ${rail ? "md:sr-only" : ""}`;

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Workspace */}
      <div ref={wsRef} className="relative px-3 pt-3">
        <button
          type="button"
          onClick={() => setWsOpen(!wsOpen)}
          aria-haspopup="listbox"
          aria-expanded={wsOpen}
          className={`pl-sb-press pl-sb-tipwrap relative flex h-12 w-full items-center gap-3 rounded-[var(--pl-radius)] px-2 text-left hover:bg-[var(--pl-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--pl-accent)] ${rail ? "md:justify-center md:px-0" : ""}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--pl-radius)-2px)] bg-[var(--pl-accent)] text-sm font-bold text-[var(--pl-surface)]">
            {logo ?? ws?.name.charAt(0)}
          </span>
          <span className={`min-w-0 flex-1 ${rail ? "md:sr-only" : ""}`}>
            <span className="block truncate text-sm font-semibold">{ws?.name}</span>
            {ws?.tag && <span className="block truncate text-xs text-[var(--pl-muted)]">{ws.tag}</span>}
          </span>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className={`shrink-0 text-[var(--pl-muted)] ${rail ? "md:hidden" : ""}`}>
            <path d="M5 6l3-3 3 3M5 10l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {rail && <Tip label={ws?.name ?? ""} />}
        </button>

        {wsOpen && (
          <div
            role="listbox"
            aria-label="Workspace wählen"
            className={`pl-sb-pop absolute top-full z-30 mt-1 rounded-[var(--pl-radius)] border border-[var(--pl-line)] bg-[var(--pl-surface)] p-1 shadow-[0_12px_32px_-8px_rgba(16,24,40,.18)] ${rail ? "left-3 w-60" : "right-3 left-3"}`}
          >
            {workspaces.map((w) => (
              <button
                key={w.id}
                type="button"
                role="option"
                aria-selected={w.id === ws?.id}
                onClick={() => pickWorkspace(w.id)}
                className="pl-sb-press flex min-h-11 w-full items-center gap-3 rounded-[calc(var(--pl-radius)-2px)] px-2 text-left text-sm hover:bg-[var(--pl-subtle)]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[calc(var(--pl-radius)-3px)] bg-[var(--pl-subtle)] text-xs font-bold">
                  {w.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1 truncate">{w.name}</span>
                {w.tag && <TagPill tag={w.tag} />}
                {w.id === ws?.id && (
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className="shrink-0 text-[var(--pl-accent)]">
                    <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Suche */}
      <div className="px-3 pt-2 pb-1">
        {rail ? (
          <button
            type="button"
            onClick={() => { setCollapsed(false); requestAnimationFrame(() => searchRef.current?.focus()); }}
            aria-label="Suchen"
            className="pl-sb-press pl-sb-tipwrap relative hidden h-10 w-full items-center justify-center rounded-[var(--pl-radius)] text-[var(--pl-muted)] hover:bg-[var(--pl-subtle)] hover:text-[var(--pl-ink)] md:flex"
          >
            <SearchIcon />
            <Tip label="Suchen (Strg K)" />
          </button>
        ) : null}
        <label className={`relative flex h-10 items-center ${rail ? "md:hidden" : ""}`}>
          <span className="sr-only">Navigation durchsuchen</span>
          <span className="pointer-events-none absolute left-3 text-[var(--pl-muted)]">
            <SearchIcon />
          </span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const hit = firstLeaf(visible);
                if (hit) navigate(hit);
              } else if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="Suchen"
            className="h-10 w-full rounded-[var(--pl-radius)] border border-[var(--pl-line)] bg-[var(--pl-surface)] pr-14 pl-9 text-sm text-[var(--pl-ink)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--pl-muted)] focus:border-[var(--pl-accent)] focus:ring-[3px] focus:ring-[var(--pl-accent)]/15 [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd className="pointer-events-none absolute right-2 rounded border border-[var(--pl-line)] bg-[var(--pl-sidebar-bg)] px-1.5 py-0.5 font-[family-name:var(--pl-font)] text-[11px] text-[var(--pl-muted)]">
            Strg K
          </kbd>
        </label>
      </div>

      {/* Navigation */}
      <nav aria-label="Hauptnavigation" className={`min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-3 ${rail ? "md:overflow-visible" : ""}`}>
        {visible.length === 0 && (
          <p className="px-2 py-6 text-sm text-[var(--pl-muted)]">
            Keine Treffer für „{query.trim()}“.{" "}
            <button type="button" onClick={() => setQuery("")} className="font-medium text-[var(--pl-accent)]">
              Suche leeren
            </button>
          </p>
        )}
        {visible.map((section) => (
          <div key={section.id} className="mt-3 first:mt-2">
            {section.label && (
              <p className={`px-2 pb-1 text-xs font-medium text-[var(--pl-muted)] ${rail ? "md:sr-only" : ""}`}>{section.label}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isGroup = !!item.children?.length;
                const open = searching || openGroups.has(item.id);
                const childActive = isGroup && containsId(item, current);
                return (
                  <li key={item.id}>
                    {isGroup ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleGroup(item)}
                          aria-expanded={open}
                          aria-controls={`pl-sb-${item.id}`}
                          className={rowCls(false, rail)}
                        >
                          <RowInner item={item} labelCls={labelCls} rail={rail} highlight={childActive && rail} />
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" className={`pl-sb-chevron ${item.badge !== undefined ? "ml-1" : "ml-auto"} shrink-0 text-[var(--pl-muted)] ${open ? "rotate-90" : ""} ${rail ? "md:hidden" : ""}`}>
                            <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {rail && <Tip label={item.label} />}
                        </button>
                        <div id={`pl-sb-${item.id}`} className={`pl-sb-group grid ${rail ? "md:hidden" : ""}`} data-open={open}>
                          <div className="min-h-0 overflow-hidden" inert={!open}>
                          <ul className="ml-[19px] flex flex-col gap-0.5 border-l border-[var(--pl-line)] pl-2">
                            {item.children!.map((child) => (
                              <li key={child.id} className="first:mt-0.5 last:mb-1">
                                <NavLink child item={child} active={child.id === current} onNavigate={navigate} className={rowCls(child.id === current, false, true)}>
                                  <span className="truncate">{child.label}</span>
                                  {child.badge !== undefined && <Badge value={child.badge} />}
                                </NavLink>
                              </li>
                            ))}
                          </ul>
                          </div>
                        </div>
                      </>
                    ) : (
                      <NavLink item={item} active={item.id === current} onNavigate={navigate} className={rowCls(item.id === current, rail)}>
                        <RowInner item={item} labelCls={labelCls} rail={rail} />
                        {rail && <Tip label={item.label} />}
                      </NavLink>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Fußbereich */}
      <div className="border-t border-[var(--pl-line)] px-3 pt-2 pb-3">
        <ul className="flex flex-col gap-0.5">
          {footer.map((item) => (
            <li key={item.id}>
              <NavLink item={item} active={item.id === current} onNavigate={navigate} className={rowCls(item.id === current, rail)}>
                <RowInner item={item} labelCls={labelCls} rail={rail} />
                {rail && <Tip label={item.label} />}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className={`mt-2 flex items-center gap-3 rounded-[var(--pl-radius)] px-2 py-2 ${rail ? "md:justify-center md:px-0" : ""}`}>
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pl-subtle)] text-xs font-bold">
            {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <span className={`min-w-0 flex-1 ${rail ? "md:sr-only" : ""}`}>
            <span className="block truncate text-sm font-medium">{user.name}</span>
            {user.email && <span className="block truncate text-xs text-[var(--pl-muted)]">{user.email}</span>}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen"}
          aria-expanded={!collapsed}
          className={`pl-sb-press pl-sb-tipwrap relative mt-1 hidden h-10 w-full items-center gap-3 rounded-[var(--pl-radius)] px-2 text-sm text-[var(--pl-muted)] hover:bg-[var(--pl-subtle)] hover:text-[var(--pl-ink)] focus-visible:outline-2 focus-visible:outline-[var(--pl-accent)] md:flex ${rail ? "md:justify-center md:px-0" : ""}`}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" className={`pl-sb-chevron shrink-0 ${collapsed ? "rotate-180" : ""}`}>
            <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7.5 4v12M12.5 8l-2 2 2 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className={labelCls}>Einklappen</span>
          {rail && <Tip label="Ausklappen" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--pl-surface)] font-[family-name:var(--pl-font)] text-[var(--pl-ink)]">
      <style>{THEME_DEFAULTS + MOTION_CSS}</style>

      {/* Desktop */}
      <aside
        className="pl-sb hidden shrink-0 border-r border-[var(--pl-line)] bg-[var(--pl-sidebar-bg)] md:block"
        style={{ width: collapsed ? 68 : 264 }}
      >
        {sidebar}
      </aside>

      {/* Handy: Schublade */}
      <div className="md:hidden">
        <div
          aria-hidden
          onClick={() => setMobileOpen(false)}
          className={`pl-sb-scrim fixed inset-0 z-40 bg-[rgba(16,24,40,.35)] ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        />
        <aside
          aria-label="Navigation"
          inert={!mobileOpen}
          className={`pl-sb-drawer fixed inset-y-0 left-0 z-50 w-[min(85vw,300px)] border-r border-[var(--pl-line)] bg-[var(--pl-sidebar-bg)] shadow-[8px_0_32px_-12px_rgba(16,24,40,.25)] ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          {sidebar}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--pl-line)] px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Navigation öffnen"
            aria-expanded={mobileOpen}
            className="pl-sb-press -ml-2 flex h-11 w-11 items-center justify-center rounded-[var(--pl-radius)] hover:bg-[var(--pl-subtle)]"
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20">
              <path d="M3 5.5h14M3 10h14M3 14.5h14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <span className="truncate text-sm font-semibold">{activeItem?.label}</span>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">
          {children ?? <DemoPage workspace={ws?.name} parent={activeParent?.label} label={activeItem?.label} />}
        </main>
      </div>
    </div>
  );
}

function rowCls(active: boolean, rail: boolean, child = false) {
  return [
    "pl-sb-press pl-sb-tipwrap group relative flex min-h-10 w-full items-center gap-3 rounded-[var(--pl-radius)] px-2 text-left text-sm",
    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pl-accent)]",
    active ? "bg-[var(--pl-subtle)] font-medium text-[var(--pl-ink)]" : "text-[var(--pl-muted)] hover:bg-[var(--pl-subtle)] hover:text-[var(--pl-ink)]",
    child ? "min-h-9" : "",
    rail ? "md:justify-center md:px-0" : "",
  ].join(" ");
}

function RowInner({ item, labelCls, rail, highlight }: { item: NavItem; labelCls: string; rail: boolean; highlight?: boolean }) {
  return (
    <>
      {item.icon && <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${highlight ? "text-[var(--pl-accent)]" : ""}`}>{item.icon}</span>}
      <span className={labelCls}>{item.label}</span>
      {item.badge !== undefined && (rail ? <span aria-hidden className="absolute top-1.5 right-2 hidden h-2 w-2 rounded-full bg-[var(--pl-accent)] md:block" /> : null)}
      {item.badge !== undefined && <span className={rail ? "ml-auto md:sr-only" : "ml-auto"}><Badge value={item.badge} /></span>}
    </>
  );
}

function NavLink({ item, active, onNavigate, className, child, children }: { item: NavItem; active: boolean; onNavigate: (i: NavItem) => void; className: string; child?: boolean; children: ReactNode }) {
  // Hauptpunkte: Balken am Rand der Leiste. Unterpunkte: Balken auf der Führungslinie.
  const indicator = active && (
    <span aria-hidden className={`absolute top-2 bottom-2 rounded-full bg-[var(--pl-accent)] ${child ? "-left-[10px] w-[2px]" : "-left-3 w-[3px] rounded-l-none"}`} />
  );
  return (
    <a
      href={item.href ?? "#"}
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        if (!item.href || item.href === "#") e.preventDefault();
        onNavigate(item);
      }}
      className={className}
    >
      {indicator}
      {children}
    </a>
  );
}

function Tip({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="pl-sb-tip absolute top-1/2 left-[calc(100%+10px)] z-40 hidden -translate-y-1/2 rounded-[calc(var(--pl-radius)-2px)] bg-[var(--pl-ink)] px-2 py-1 text-xs font-medium whitespace-nowrap text-[var(--pl-surface)] md:block"
    >
      {label}
    </span>
  );
}

function Badge({ value }: { value: string | number }) {
  return (
    <span className="rounded-full bg-[var(--pl-accent)]/12 px-1.5 py-px text-[11px] font-semibold text-[var(--pl-accent)] tabular-nums">
      {value}
    </span>
  );
}

function TagPill({ tag }: { tag: string }) {
  return (
    <span className="rounded-full border border-[var(--pl-line)] px-1.5 py-px text-[11px] font-medium text-[var(--pl-muted)]">{tag}</span>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DemoPage({ workspace, parent, label }: { workspace?: string; parent?: string; label?: string }) {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:px-10 md:py-10">
      <p className="text-sm text-[var(--pl-muted)]">
        {[workspace, parent].filter(Boolean).join(" / ")}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-[-0.02em]">{label}</h1>
      <p className="mt-3 max-w-prose text-[var(--pl-muted)]">
        Hier steht der Inhalt der Seite. Probier die Suche mit Strg K, klapp Gruppen auf oder die ganze Leiste ein.
      </p>
    </div>
  );
}

/* Demo-Inhalte, solange das Projekt keine eigenen übergibt. */
const ic = (d: string) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const ICONS = {
  home: ic("M3.5 9L10 3.5 16.5 9v7a1 1 0 0 1-1 1h-3.5v-5h-4v5H4.5a1 1 0 0 1-1-1z"),
  chart: ic("M3.5 16.5h13M6 13.5V9M10 13.5V5.5M14 13.5v-3"),
  globe: ic("M10 16.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM3.5 10h13M10 3.5c1.8 1.8 2.6 4 2.6 6.5S11.8 14.7 10 16.5C8.2 14.7 7.4 12.5 7.4 10S8.2 5.3 10 3.5z"),
  shield: ic("M10 3l6 2.2v4.6c0 3.4-2.5 6.1-6 7.2-3.5-1.1-6-3.8-6-7.2V5.2z"),
  zap: ic("M11 2.5L4.5 11h5l-1 6.5L15 9h-5z"),
  wallet: ic("M3.5 6.5h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1zM3.5 6.5l9-3v3M13.5 11.5h.01"),
  users: ic("M7.5 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 16.5c.5-2.8 2.5-4.5 5-4.5s4.5 1.7 5 4.5M13 4a3 3 0 0 1 0 5.5M14.5 12.3c1.6.6 2.7 2 3 4.2"),
  settings: ic("M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16 10l1.5-1-1.5-2.6-1.7.4a5.5 5.5 0 0 0-1.6-.9L12.2 4H9.2l-.5 1.9c-.6.2-1.1.5-1.6.9l-1.7-.4L3.9 9 5.4 10l-1.5 1 1.5 2.6 1.7-.4c.5.4 1 .7 1.6.9l.5 1.9h3l.5-1.9c.6-.2 1.1-.5 1.6-.9l1.7.4L17.5 11z"),
  help: ic("M10 16.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM8 8a2 2 0 1 1 2.8 1.8c-.5.3-.8.7-.8 1.2v.5M10 13.5h.01"),
  bell: ic("M5.5 13.5V9a4.5 4.5 0 0 1 9 0v4.5l1.5 1.5h-12zM8.5 17h3"),
};

const DEMO_WORKSPACES: Workspace[] = [
  { id: "live", name: "Soul Codes", tag: "Live" },
  { id: "test", name: "Soul Codes", tag: "Test" },
  { id: "agentlabs", name: "Agent Labs", tag: "Live" },
];

const DEMO_SECTIONS: NavSection[] = [
  {
    id: "main",
    items: [
      { id: "overview", label: "Übersicht", icon: ICONS.home },
      { id: "analytics", label: "Analysen", icon: ICONS.chart },
    ],
  },
  {
    id: "project",
    label: "Projekt",
    items: [
      {
        id: "domains",
        label: "Domains",
        icon: ICONS.globe,
        children: [
          { id: "domains-all", label: "Alle Domains" },
          { id: "dns", label: "DNS-Einträge" },
          { id: "certs", label: "Zertifikate" },
        ],
      },
      {
        id: "security",
        label: "Sicherheit",
        icon: ICONS.shield,
        badge: 2,
        children: [
          { id: "firewall", label: "Firewall-Regeln" },
          { id: "bots", label: "Bot-Schutz", badge: 2 },
          { id: "audit", label: "Protokoll" },
        ],
      },
      { id: "functions", label: "Funktionen", icon: ICONS.zap },
    ],
  },
  {
    id: "account",
    label: "Konto",
    items: [
      { id: "billing", label: "Abrechnung", icon: ICONS.wallet },
      { id: "team", label: "Team", icon: ICONS.users, badge: 3 },
      { id: "settings", label: "Einstellungen", icon: ICONS.settings },
    ],
  },
];

const DEMO_FOOTER: NavItem[] = [
  { id: "news", label: "Neuigkeiten", icon: ICONS.bell, badge: "Neu" },
  { id: "help", label: "Hilfe und Support", icon: ICONS.help },
];

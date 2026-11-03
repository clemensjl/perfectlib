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
 * - Desktop: standardmäßig eingeklappt (nur Icons, Logo, Profilbild). Fährt beim Darüberfahren nach
 *   OPEN_DELAY als Overlay aus und erst wieder ein, wenn der Zeiger LEAVE_MARGIN px rechts daneben ist.
 *   Gruppen klappen beim Darüberfahren nach GROUP_DELAY auf. "Anheften" hält die Leiste offen.
 * - Icons stehen eingeklappt und ausgefahren an derselben Stelle, nichts springt.
 * - Suche: filtert live, klappt Gruppen mit Treffern auf, Enter öffnet den ersten Treffer, Strg/Cmd+K fokussiert.
 * - Handy: Schublade mit Escape und Tipp daneben.
 * - Animationen und ihr Verhalten bei prefers-reduced-motion (MOTION_CSS).
 * - Barrierefreiheit: aria-current, aria-expanded, Tastatur-Fokus fährt die Leiste aus.
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
  /** Überschreibt für diese Gruppe, wie die Unterpunkte aufgehen. */
  submenu?: SubmenuMode;
};
/** "inline": Pfeil nach unten, Unterpunkte klappen darunter auf. "flyout": Pfeil nach rechts, Unterpunkte öffnen seitlich. */
export type SubmenuMode = "inline" | "flyout";
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
  /** Standard für alle Gruppen, einzelne Gruppen können per item.submenu abweichen. */
  submenu?: SubmenuMode;
  /** Schlüssel für den gemerkten Anheft-Zustand im Browser. */
  storageKey?: string;
  children?: ReactNode;
};

const RAIL = 64;
const WIDE = 264;
const OPEN_DELAY = 120; // ms, damit die Leiste beim bloßen Vorbeiziehen nicht aufgeht
const LEAVE_MARGIN = 32; // px Toleranz rechts neben der ausgefahrenen Leiste
const GROUP_DELAY = 150; // ms, bis eine Gruppe beim Darüberfahren aufklappt
const FLYOUT_CLOSE = 220; // ms Gnadenfrist, um vom Menüpunkt ins seitliche Menü zu wechseln

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
.pl-sb{transition:width .26s cubic-bezier(.23,1,.32,1),box-shadow .2s ease-out}
.pl-sb-fade{transition:opacity .14s ease-out}
.pl-sb[data-rail=false] .pl-sb-fade{transition:opacity .2s ease-out .06s}
.pl-sb-group{grid-template-rows:0fr;transition:grid-template-rows .22s cubic-bezier(.23,1,.32,1)}
.pl-sb-group[data-open=true]{grid-template-rows:1fr}
.pl-sb-chevron{transition:transform .2s cubic-bezier(.23,1,.32,1),opacity .14s ease-out}
.pl-sb-drawer{transition:transform .26s cubic-bezier(.32,.72,0,1)}
.pl-sb-scrim{transition:opacity .2s ease-out}
.pl-sb-fly{animation:pl-sb-fly .16s cubic-bezier(.23,1,.32,1) both;transform-origin:left top}
@keyframes pl-sb-fly{from{opacity:0;transform:translateX(-6px) scale(.98)}to{opacity:1;transform:none}}
.pl-sb-pop{animation:pl-sb-pop .16s cubic-bezier(.23,1,.32,1) both;transform-origin:top center}
.pl-sb-press{transition:background-color .12s,color .12s,transform .12s cubic-bezier(.23,1,.32,1)}
.pl-sb-press:active{transform:scale(.98)}
@keyframes pl-sb-pop{from{opacity:0;transform:scale(.97) translateY(-4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){
.pl-sb,.pl-sb-group,.pl-sb-chevron,.pl-sb-drawer{transition-duration:.01s}
.pl-sb-pop,.pl-sb-fly{animation-name:pl-sb-fade}
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
  submenu = "inline",
  storageKey = "perfectlib:sidebar-pinned",
  children,
}: SidebarProps) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
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
  const [hoverGroups, setHoverGroups] = useState<Set<string>>(() => new Set());
  const [flyout, setFlyout] = useState<{ item: NavItem; top: number } | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const flyoutTimer = useRef<number | undefined>(undefined);
  const wrapRef = useRef<HTMLDivElement>(null);

  const panelRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const groupTimer = useRef<number | undefined>(undefined);
  const suppressGroup = useRef<string | null>(null);
  const keyboardInside = useRef(false);
  // Aktuelle Werte für die Dokument-Listener, ohne sie bei jedem Render neu zu binden.
  const live = useRef({ wsOpen, query });
  useEffect(() => {
    live.current = { wsOpen, query };
  });

  const expanded = pinned || hovered;
  const rail = !expanded;
  const visible = useMemo(() => filterSections(sections, query), [sections, query]);
  const searching = query.trim().length > 0;

  useEffect(() => {
    try {
      // Gemerkten Zustand erst nach dem Hydrieren übernehmen, damit Server- und Client-HTML gleich bleiben.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(storageKey) === "1") setPinned(true);
    } catch {}
  }, [storageKey]);

  function collapseHover() {
    window.clearTimeout(openTimer.current);
    setHovered(false);
    setHoverGroups(new Set());
    setWsOpen(false);
    setFlyout(null);
  }

  const inFlyout = (x: number, y: number) => {
    const box = flyoutRef.current?.getBoundingClientRect();
    return !!box && x >= box.left - 8 && x <= box.right && y >= box.top && y <= box.bottom;
  };

  function openFlyout(item: NavItem, el: HTMLElement, delay: number) {
    window.clearTimeout(flyoutTimer.current);
    flyoutTimer.current = window.setTimeout(() => {
      const wrap = wrapRef.current?.getBoundingClientRect();
      const row = el.getBoundingClientRect();
      if (!wrap) return;
      const estimated = 52 + (item.children?.length ?? 0) * 38;
      const top = Math.max(8, Math.min(row.top - wrap.top - 8, window.innerHeight - wrap.top - estimated - 8));
      setFlyout({ item, top });
    }, delay);
  }

  function closeFlyoutSoon() {
    window.clearTimeout(flyoutTimer.current);
    flyoutTimer.current = window.setTimeout(() => setFlyout(null), FLYOUT_CLOSE);
  }

  function keepOpen() {
    const s = live.current;
    return s.wsOpen || !!s.query.trim() || keyboardInside.current || document.activeElement === searchRef.current;
  }

  // Einfahren erst mit Abstand: Zeiger mehr als LEAVE_MARGIN px rechts neben der Leiste, Fenster verlassen
  // oder Tipp/Klick außerhalb.
  useEffect(() => {
    if (!hovered || pinned) return;
    const onMove = (e: PointerEvent) => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (rect && e.clientX > rect.right + LEAVE_MARGIN && !inFlyout(e.clientX, e.clientY) && !keepOpen()) collapseHover();
    };
    const onLeaveWindow = (e: PointerEvent) => {
      if (!e.relatedTarget && !keepOpen()) collapseHover();
    };
    const onDownOutside = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !flyoutRef.current?.contains(e.target as Node)) collapseHover();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerout", onLeaveWindow);
    document.addEventListener("pointerdown", onDownOutside);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeaveWindow);
      document.removeEventListener("pointerdown", onDownOutside);
    };
  }, [hovered, pinned]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setHovered(true);
        setMobileOpen(true);
        requestAnimationFrame(() => searchRef.current?.focus());
      } else if (e.key === "Escape") {
        setMobileOpen(false);
        setWsOpen(false);
        setFlyout(null);
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

  function togglePinned() {
    const next = !pinned;
    setPinned(next);
    if (!next) setHovered(true); // Zeiger ist noch auf der Leiste, sie bleibt bis zum Verlassen offen
    try {
      localStorage.setItem(storageKey, next ? "1" : "0");
    } catch {}
  }

  function navigate(item: NavItem) {
    setFlyout(null);
    setOwnActive(item.id);
    onNavigate?.(item);
    setMobileOpen(false);
    setQuery("");
  }

  function hoverGroup(item: NavItem) {
    window.clearTimeout(groupTimer.current);
    if (suppressGroup.current === item.id) return;
    groupTimer.current = window.setTimeout(() => setHoverGroups((g) => new Set(g).add(item.id)), GROUP_DELAY);
  }

  function leaveGroup(item: NavItem) {
    window.clearTimeout(groupTimer.current);
    if (suppressGroup.current === item.id) suppressGroup.current = null;
  }

  function toggleGroup(item: NavItem, isOpen: boolean) {
    window.clearTimeout(groupTimer.current);
    if (rail) {
      setHovered(true);
      setOpenGroups((g) => new Set(g).add(item.id));
      return;
    }
    if (isOpen) {
      // Per Klick geschlossen: bis der Zeiger die Gruppe verlässt, nicht wieder per Hover öffnen.
      suppressGroup.current = item.id;
      setOpenGroups((g) => { const n = new Set(g); n.delete(item.id); return n; });
      setHoverGroups((g) => { const n = new Set(g); n.delete(item.id); return n; });
    } else {
      setOpenGroups((g) => new Set(g).add(item.id));
    }
  }

  function pickWorkspace(id: string) {
    setOwnWs(id);
    onWorkspaceChange?.(id);
    setWsOpen(false);
  }

  const activeItem = sections.flatMap((s) => s.items.flatMap((i) => [i, ...(i.children ?? [])])).find((i) => i.id === current);
  const activeParent = sections.flatMap((s) => s.items).find((i) => i.children?.some((c) => c.id === current));

  const renderSidebar = (isRail: boolean, drawer = false) => {
    const fade = `pl-sb-fade ${isRail ? "opacity-0" : "opacity-100"}`;
    return (
      <div className="flex h-full flex-col" style={drawer ? undefined : { width: WIDE }}>
        {/* Workspace */}
        <div ref={drawer ? undefined : wsRef} className="relative px-3 pt-3">
          <button
            type="button"
            onClick={() => (isRail ? setHovered(true) : setWsOpen(!wsOpen))}
            aria-haspopup="listbox"
            aria-expanded={wsOpen}
            className="pl-sb-press flex h-12 w-full items-center gap-3 rounded-[var(--pl-radius)] px-1 text-left hover:bg-[var(--pl-subtle)] focus-visible:outline-2 focus-visible:outline-[var(--pl-accent)]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--pl-radius)-2px)] bg-[var(--pl-accent)] text-sm font-bold text-[var(--pl-surface)]">
              {logo ?? ws?.name.charAt(0)}
            </span>
            <span className={`min-w-0 flex-1 ${fade}`}>
              <span className="block truncate text-sm font-semibold">{ws?.name}</span>
              {ws?.tag && <span className="block truncate text-xs text-[var(--pl-muted)]">{ws.tag}</span>}
            </span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className={`mr-1 shrink-0 text-[var(--pl-muted)] ${fade}`}>
              <path d="M5 6l3-3 3 3M5 10l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {wsOpen && !isRail && (
            <div
              role="listbox"
              aria-label="Workspace wählen"
              className="pl-sb-pop absolute top-full right-3 left-3 z-30 mt-1 rounded-[var(--pl-radius)] border border-[var(--pl-line)] bg-[var(--pl-surface)] p-1 shadow-[0_12px_32px_-8px_rgba(16,24,40,.18)]"
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

        {/* Suche: eingeklappt ist nur das Lupen-Feld sichtbar, die Lupe bleibt an ihrer Stelle */}
        <div className="px-3 pt-2 pb-1">
          <label className="relative flex h-10 items-center transition-[width] duration-[260ms] ease-[cubic-bezier(.23,1,.32,1)] motion-reduce:transition-none" style={{ width: isRail ? 40 : WIDE - 24 }}>
            <span className="sr-only">Navigation durchsuchen</span>
            <span className="pointer-events-none absolute left-3 text-[var(--pl-muted)]">
              <SearchIcon />
            </span>
            <input
              ref={drawer ? undefined : searchRef}
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
              placeholder={isRail ? "" : "Suchen"}
              className="h-10 w-full rounded-[var(--pl-radius)] border border-[var(--pl-line)] bg-[var(--pl-surface)] pr-14 pl-9 text-sm text-[var(--pl-ink)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--pl-muted)] focus:border-[var(--pl-accent)] focus:ring-[3px] focus:ring-[var(--pl-accent)]/15 [&::-webkit-search-cancel-button]:hidden"
            />
            <kbd className={`pointer-events-none absolute right-2 rounded border border-[var(--pl-line)] bg-[var(--pl-sidebar-bg)] px-1.5 py-0.5 font-[family-name:var(--pl-font)] text-[11px] text-[var(--pl-muted)] ${fade}`}>
              Strg K
            </kbd>
          </label>
        </div>

        {/* Navigation */}
        <nav aria-label="Hauptnavigation" className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-3">
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
              {section.label && <p className={`h-6 truncate px-2.5 text-xs leading-6 font-medium text-[var(--pl-muted)] ${fade}`}>{section.label}</p>}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const isGroup = !!item.children?.length;
                  const mode: SubmenuMode = drawer ? "inline" : (item.submenu ?? submenu);
                  if (isGroup && mode === "flyout") {
                    const flyOpen = flyout?.item.id === item.id;
                    const childOn = containsId(item, current);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={(e) => (flyOpen ? setFlyout(null) : openFlyout(item, e.currentTarget, 0))}
                          onPointerEnter={(e) => openFlyout(item, e.currentTarget, flyout ? 0 : 100)}
                          onPointerLeave={closeFlyoutSoon}
                          aria-expanded={flyOpen}
                          aria-controls="pl-sb-flyout"
                          className={rowCls(childOn || flyOpen)}
                        >
                          <RowInner item={item} fade={fade} isRail={isRail} accent={childOn} />
                          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" className={`pl-sb-chevron ${item.badge !== undefined ? "ml-1" : "ml-auto"} mr-1 shrink-0 text-[var(--pl-muted)] ${isRail ? "opacity-0" : ""}`}>
                            <path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </li>
                    );
                  }
                  const open = !isRail && (searching || openGroups.has(item.id) || hoverGroups.has(item.id));
                  const childActive = isGroup && containsId(item, current);
                  return (
                    <li key={item.id}>
                      {isGroup ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleGroup(item, open)}
                            onPointerEnter={() => hoverGroup(item)}
                            onPointerLeave={() => leaveGroup(item)}
                            aria-expanded={open}
                            aria-controls={`pl-sb-${item.id}${drawer ? "-m" : ""}`}
                            className={rowCls(childActive && isRail)}
                          >
                            <RowInner item={item} fade={fade} isRail={isRail} accent={childActive && isRail} />
                            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" className={`pl-sb-chevron ${item.badge !== undefined ? "ml-1" : "ml-auto"} mr-1 shrink-0 text-[var(--pl-muted)] ${open ? "rotate-180" : ""} ${isRail ? "opacity-0" : ""}`}>
                              <path d="M3.5 6L8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <div id={`pl-sb-${item.id}${drawer ? "-m" : ""}`} className="pl-sb-group grid" data-open={open}>
                            <div className="min-h-0 overflow-hidden" inert={!open}>
                              <ul className="ml-[20px] flex flex-col gap-0.5 border-l border-[var(--pl-line)] pl-2">
                                {item.children!.map((child) => (
                                  <li key={child.id} className="first:mt-0.5 last:mb-1">
                                    <NavLink child item={child} active={child.id === current} onNavigate={navigate} className={rowCls(child.id === current, true)}>
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
                        <NavLink item={item} active={item.id === current} onNavigate={navigate} className={rowCls(item.id === current)}>
                          <RowInner item={item} fade={fade} isRail={isRail} />
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
                <NavLink item={item} active={item.id === current} onNavigate={navigate} className={rowCls(item.id === current)}>
                  <RowInner item={item} fade={fade} isRail={isRail} />
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-3 px-1 py-2">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pl-subtle)] text-xs font-bold">
              {user.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </span>
            <span className={`min-w-0 flex-1 ${fade}`}>
              <span className="block truncate text-sm font-medium">{user.name}</span>
              {user.email && <span className="block truncate text-xs text-[var(--pl-muted)]">{user.email}</span>}
            </span>
          </div>
          {!drawer && (
            <button
              type="button"
              onClick={togglePinned}
              aria-pressed={pinned}
              className="pl-sb-press mt-1 flex h-10 w-full items-center gap-3 rounded-[var(--pl-radius)] px-[11px] text-sm text-[var(--pl-muted)] hover:bg-[var(--pl-subtle)] hover:text-[var(--pl-ink)] focus-visible:outline-2 focus-visible:outline-[var(--pl-accent)]"
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 20 20" className="shrink-0">
                <rect x="2.75" y="3.75" width="14.5" height="12.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7.5 4v12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                {pinned && <path d="M3.5 4.5h3.25v11H3.5z" fill="currentColor" />}
              </svg>
              <span className={`truncate ${fade}`}>{pinned ? "Lösen" : "Anheften"}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[var(--pl-surface)] font-[family-name:var(--pl-font)] text-[var(--pl-ink)]">
      <style>{THEME_DEFAULTS + MOTION_CSS}</style>

      {/* Desktop: Platzhalter im Layout, die Leiste selbst liegt darüber und wächst als Overlay */}
      <div ref={wrapRef} className="pl-sb relative z-30 hidden shrink-0 md:block" style={{ width: pinned ? WIDE : RAIL }}>
        <aside
          ref={panelRef}
          data-rail={rail}
          onPointerEnter={() => {
            if (pinned || hovered) return;
            window.clearTimeout(openTimer.current);
            openTimer.current = window.setTimeout(() => setHovered(true), OPEN_DELAY);
          }}
          onPointerLeave={() => window.clearTimeout(openTimer.current)}
          onFocus={(e) => {
            if (e.target.matches(":focus-visible")) {
              keyboardInside.current = true;
              setHovered(true);
            }
          }}
          onBlur={(e) => {
            if (!panelRef.current?.contains(e.relatedTarget as Node)) {
              keyboardInside.current = false;
              if (!panelRef.current?.matches(":hover")) collapseHover();
            }
          }}
          className={`pl-sb absolute inset-y-0 left-0 z-30 overflow-hidden border-r border-[var(--pl-line)] bg-[var(--pl-sidebar-bg)] ${hovered && !pinned ? "shadow-[12px_0_32px_-16px_rgba(16,24,40,.28)]" : ""}`}
          style={{ width: expanded ? WIDE : RAIL }}
        >
          {renderSidebar(rail)}
        </aside>
        {flyout && (
          <div
            ref={flyoutRef}
            id="pl-sb-flyout"
            role="group"
            aria-label={flyout.item.label}
            onPointerEnter={() => window.clearTimeout(flyoutTimer.current)}
            onPointerLeave={closeFlyoutSoon}
            className="pl-sb-fly absolute z-40 w-56 rounded-[var(--pl-radius)] border border-[var(--pl-line)] bg-[var(--pl-surface)] p-1.5 shadow-[0_16px_40px_-12px_rgba(16,24,40,.25)]"
            style={{ left: (expanded ? WIDE : RAIL) + 6, top: flyout.top }}
          >
            <p className="px-2.5 pt-1.5 pb-1 text-xs font-medium text-[var(--pl-muted)]">{flyout.item.label}</p>
            <ul className="flex flex-col gap-0.5">
              {flyout.item.children!.map((child) => (
                <li key={child.id}>
                  <NavLink item={child} active={child.id === current} onNavigate={navigate} className={rowCls(child.id === current, true)}>
                    <span className="truncate">{child.label}</span>
                    {child.badge !== undefined && <span className="ml-auto"><Badge value={child.badge} /></span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
          {renderSidebar(false, true)}
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

function rowCls(active: boolean, child = false) {
  return [
    "pl-sb-press group relative flex w-full items-center gap-3 rounded-[var(--pl-radius)] text-left text-sm whitespace-nowrap",
    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--pl-accent)]",
    active ? "bg-[var(--pl-subtle)] font-medium text-[var(--pl-ink)]" : "text-[var(--pl-muted)] hover:bg-[var(--pl-subtle)] hover:text-[var(--pl-ink)]",
    child ? "min-h-9 px-2" : "min-h-10 px-2.5",
  ].join(" ");
}

function RowInner({ item, fade, isRail, accent }: { item: NavItem; fade: string; isRail: boolean; accent?: boolean }) {
  return (
    <>
      {item.icon && <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${accent ? "text-[var(--pl-accent)]" : ""}`}>{item.icon}</span>}
      <span className={`truncate ${fade}`}>{item.label}</span>
      {item.badge !== undefined && (
        <>
          <span aria-hidden className={`pl-sb-fade absolute top-1.5 left-[30px] h-2 w-2 rounded-full bg-[var(--pl-accent)] ${isRail ? "opacity-100" : "opacity-0"}`} />
          <span className={`ml-auto ${fade}`}>
            <Badge value={item.badge} />
          </span>
        </>
      )}
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
      <p className="text-sm text-[var(--pl-muted)]">{[workspace, parent].filter(Boolean).join(" / ")}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-[-0.02em]">{label}</h1>
      <p className="mt-3 max-w-prose text-[var(--pl-muted)]">
        Fahr mit der Maus über die Leiste links, sie klappt aus. „Domains“ öffnet seitlich (Pfeil nach rechts),
        „Sicherheit“ klappt nach unten auf (Pfeil nach unten). Strg K springt in die Suche.
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
        submenu: "flyout",
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

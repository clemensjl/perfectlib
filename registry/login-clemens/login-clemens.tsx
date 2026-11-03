"use client";

import { useState, type FormEvent, type ReactNode } from "react";

type LoginProps = {
  productName?: string;
  tagline?: string;
  initialMode?: "login" | "register";
  /** Die Handler werfen einen Error mit lesbarer Meldung, wenn etwas scheitert. */
  onLogin?: (email: string, password: string) => Promise<void>;
  onRegister?: (name: string, email: string, password: string) => Promise<void>;
  onMagicLink?: (email: string) => Promise<void>;
  onGoogle?: () => void;
  onApple?: () => void;
  privacyHref?: string;
  termsHref?: string;
};

type View = "login" | "register" | "sent" | "done" | "verify";
type Field = "" | "name" | "email" | "pw";

const MIN_PW = 8;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

const inputCls =
  "h-12 w-full rounded-[10px] border bg-white px-3.5 text-base text-[#15171c] outline-none focus:border-[#2f5bea] focus:ring-[3px] focus:ring-[#2f5bea]/20";
const ghostCls =
  "flex h-12 items-center justify-center gap-2.5 rounded-[10px] border border-[#d5dae1] bg-white px-5 text-[15px] font-semibold text-[#15171c] hover:bg-[#eef1f4] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#2f5bea]";
const linkCls = "text-[#2f5bea] hover:text-[#1d44c4]";
const titleCls = "m-0 text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em]";
const leadCls = "mt-3 text-base leading-normal text-[#5d6573]";

export default function LoginClemens({
  productName = "PerfectLib",
  tagline = "Ein Login, der einfach funktioniert.",
  initialMode = "login",
  onLogin = () => wait(900),
  onRegister = () => wait(900),
  onMagicLink = () => wait(300),
  onGoogle,
  onApple,
  privacyHref = "#",
  termsHref = "#",
}: LoginProps) {
  const [view, setView] = useState<View>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [field, setField] = useState<Field>("");

  const isRegister = view === "register";
  const pwOk = password.length >= MIN_PW;

  function fail(message: string, f: Field = "") {
    setError(message);
    setField(f);
  }

  function clear() {
    setError("");
    setField("");
  }

  function go(next: View) {
    clear();
    setLoading(false);
    setView(next);
  }

  async function run(action: () => Promise<void>, next: View, fallback: string) {
    clear();
    setLoading(true);
    try {
      await action();
      setView(next);
    } catch (err) {
      fail(messageOf(err, fallback));
    } finally {
      setLoading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (isRegister && !name.trim()) return fail("Gib deinen Namen ein.", "name");
    if (!validEmail(email)) return fail("Diese E-Mail-Adresse ist unvollständig. Prüfe sie und versuch es nochmal.", "email");
    if (isRegister) {
      if (!pwOk) return fail(`Das Passwort braucht mindestens ${MIN_PW} Zeichen.`, "pw");
      if (!terms) return fail("Bestätige die Datenschutzerklärung und die Nutzungsbedingungen, um fortzufahren.");
      return run(() => onRegister(name.trim(), email, password), "verify", "Das Konto konnte nicht erstellt werden. Versuch es nochmal.");
    }
    if (!password) return fail("Gib dein Passwort ein.", "pw");
    return run(() => onLogin(email, password), "done", "Anmeldung fehlgeschlagen. Versuch es nochmal.");
  }

  function sendLink() {
    if (!validEmail(email)) return fail("Gib zuerst deine E-Mail-Adresse ein, dann schicken wir dir einen Anmeldelink.", "email");
    return run(() => onMagicLink(email), "sent", "Der Link konnte nicht verschickt werden. Versuch es nochmal.");
  }

  const border = (f: Field) => (field === f ? "border-[#c4302b]" : "border-[#d5dae1]");

  return (
    <div className="flex min-h-screen flex-wrap bg-white text-[#15171c]">
      <main className="flex min-w-0 flex-[999_1_520px] flex-col justify-between gap-10 px-[clamp(24px,6vw,88px)] py-10">
        <div className="text-lg font-bold tracking-[-0.01em]">{productName}</div>

        <div className="w-full max-w-[400px]">
          {(view === "login" || view === "register") && (
            <>
              <h1 className={titleCls}>{isRegister ? "Konto erstellen" : "Willkommen zurück"}</h1>
              <p className={leadCls}>
                {isRegister
                  ? "Dauert eine Minute. Danach bestätigst du deine E-Mail-Adresse."
                  : "Melde dich mit deiner E-Mail-Adresse an."}
              </p>

              <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-[18px]">
                {isRegister && (
                  <Labeled id="pl-name" label="Name">
                    <input
                      id="pl-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => { setName(e.target.value); clear(); }}
                      aria-invalid={field === "name"}
                      className={`${inputCls} ${border("name")}`}
                    />
                  </Labeled>
                )}

                <Labeled id="pl-email" label="E-Mail">
                  <input
                    id="pl-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@beispiel.at"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value.trim()); clear(); }}
                    aria-invalid={field === "email"}
                    className={`${inputCls} ${border("email")}`}
                  />
                </Labeled>

                <Labeled
                  id="pl-pw"
                  label="Passwort"
                  aside={
                    !isRegister && (
                      <button type="button" onClick={sendLink} className={`text-sm ${linkCls}`}>
                        Passwort vergessen?
                      </button>
                    )
                  }
                >
                  <div className="relative">
                    <input
                      id="pl-pw"
                      type={showPw ? "text" : "password"}
                      autoComplete={isRegister ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clear(); }}
                      aria-invalid={field === "pw"}
                      aria-describedby={isRegister ? "pl-pw-hint" : undefined}
                      className={`${inputCls} pr-[76px] ${border("pw")}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
                      className="absolute top-1 right-1 h-10 min-w-16 rounded-lg text-sm font-semibold text-[#5d6573] hover:text-[#15171c]"
                    >
                      {showPw ? "Verbergen" : "Zeigen"}
                    </button>
                  </div>
                  {isRegister && (
                    <p id="pl-pw-hint" className={`m-0 text-[13px] ${pwOk ? "text-[#13795b]" : "text-[#5d6573]"}`}>
                      {pwOk ? `Passt, mindestens ${MIN_PW} Zeichen.` : `Mindestens ${MIN_PW} Zeichen.`}
                    </p>
                  )}
                </Labeled>

                {isRegister && (
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-[1.45] text-[#5d6573]">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(e) => { setTerms(e.target.checked); clear(); }}
                      className="mt-px h-[18px] w-[18px] shrink-0 accent-[#2f5bea]"
                    />
                    <span>
                      Ich habe die <a href={privacyHref} className={linkCls}>Datenschutzerklärung</a> gelesen und
                      stimme den <a href={termsHref} className={linkCls}>Nutzungsbedingungen</a> zu.
                    </span>
                  </label>
                )}

                {error && (
                  <p role="alert" className="m-0 rounded-[10px] bg-[#fdecec] px-3.5 py-3 text-sm leading-[1.45] text-[#a3201b]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-1.5 h-[50px] rounded-[10px] bg-[#2f5bea] text-base font-bold text-white hover:bg-[#2650d6] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#2f5bea] disabled:opacity-70"
                >
                  {isRegister
                    ? loading ? "Konto wird erstellt …" : "Konto erstellen"
                    : loading ? "Wird angemeldet …" : "Anmelden"}
                </button>
              </form>

              <div className="my-7 flex items-center gap-3.5 text-sm text-[#5d6573]">
                <span className="h-px flex-1 bg-[#d5dae1]" />
                <span>oder</span>
                <span className="h-px flex-1 bg-[#d5dae1]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onGoogle} className={ghostCls}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
                    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
                  </svg>
                  Google
                </button>
                <button type="button" onClick={onApple} className={ghostCls}>
                  <svg aria-hidden="true" width="17" height="18" viewBox="0 0 17 20">
                    <path fill="#15171c" d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9A5 5 0 0 0 1 7.3c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.2 3-2.5a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.3-4.1zM11.6 3a4.4 4.4 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1c1.1.1 2.2-.5 2.9-1.4z" />
                  </svg>
                  Apple
                </button>
              </div>
            </>
          )}

          {view === "sent" && (
            <Message
              title="Schau in dein Postfach"
              text={`Wir haben einen Anmeldelink an ${email} geschickt.`}
              action="Zurück zur Anmeldung"
              onAction={() => go("login")}
            />
          )}

          {view === "verify" && (
            <Message
              title="Bestätige deine E&#8209;Mail"
              text={`Wir haben einen Bestätigungslink an ${email} geschickt. Sobald du ihn öffnest, ist dein Konto aktiv.`}
              action="Andere E-Mail verwenden"
              onAction={() => go("register")}
            />
          )}

          {view === "done" && (
            <Message title="Angemeldet" text="Du wirst weitergeleitet." action="Nochmal von vorn" onAction={() => go("login")} />
          )}
        </div>

        {view === "login" || view === "register" ? (
          <p className="m-0 text-sm text-[#5d6573]">
            {isRegister ? "Schon ein Konto? " : "Noch kein Konto? "}
            <button type="button" onClick={() => go(isRegister ? "login" : "register")} className={linkCls}>
              {isRegister ? "Anmelden" : "Konto erstellen"}
            </button>
          </p>
        ) : (
          <span aria-hidden />
        )}
      </main>

      <aside className="hidden min-h-screen flex-[1_1_380px] flex-col justify-end bg-[#2f5bea] p-14 text-white min-[861px]:flex">
        <p className="m-0 max-w-[420px] text-[34px] leading-[1.12] font-bold tracking-[-0.02em]">{tagline}</p>
        <p className="mt-5 text-[15px] text-white/80">{productName}</p>
      </aside>
    </div>
  );
}

function Labeled({ id, label, aside, children }: { id: string; label: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Message({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <>
      <h1 className={titleCls}>{title}</h1>
      <p className={leadCls}>{text}</p>
      <button type="button" onClick={onAction} className={`${ghostCls} mt-8`}>
        {action}
      </button>
    </>
  );
}

"use client";

import { useState, type FormEvent } from "react";

type LoginProps = {
  productName?: string;
  tagline?: string;
  /** Wirft einen Error mit lesbarer Meldung, wenn die Anmeldung scheitert. */
  onLogin?: (email: string, password: string) => Promise<void>;
  onMagicLink?: (email: string) => Promise<void>;
  onGoogle?: () => void;
  onApple?: () => void;
  signUpHref?: string;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export default function LoginClemens({
  productName = "PerfectLib",
  tagline = "Ein Login, der einfach funktioniert.",
  onLogin = () => wait(900),
  onMagicLink = () => wait(300),
  onGoogle,
  onApple,
  signUpHref = "#",
}: LoginProps) {
  const [view, setView] = useState<"form" | "sent" | "done">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [field, setField] = useState<"" | "email" | "pw">("");

  function fail(message: string, f: typeof field = "") {
    setError(message);
    setField(f);
  }

  function clear() {
    setError("");
    setField("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (!validEmail(email)) return fail("Diese E-Mail-Adresse ist unvollständig. Prüfe sie und versuch es nochmal.", "email");
    if (!password) return fail("Gib dein Passwort ein.", "pw");
    clear();
    setLoading(true);
    try {
      await onLogin(email, password);
      setView("done");
    } catch (err) {
      fail(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen. Versuch es nochmal.");
    } finally {
      setLoading(false);
    }
  }

  async function sendLink() {
    if (!validEmail(email)) return fail("Gib zuerst deine E-Mail-Adresse ein, dann schicken wir dir einen Anmeldelink.", "email");
    clear();
    try {
      await onMagicLink(email);
      setView("sent");
    } catch (err) {
      fail(err instanceof Error ? err.message : "Der Link konnte nicht verschickt werden. Versuch es nochmal.");
    }
  }

  const input =
    "h-12 w-full rounded-[10px] border bg-white px-3.5 text-base text-[#15171c] outline-none focus:border-[#2f5bea] focus:ring-[3px] focus:ring-[#2f5bea]/20";
  const ghost =
    "flex h-12 items-center justify-center gap-2.5 rounded-[10px] border border-[#d5dae1] bg-white px-5 text-[15px] font-semibold text-[#15171c] hover:bg-[#eef1f4] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#2f5bea]";
  const title = "m-0 text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em]";
  const lead = "mt-3 text-base leading-normal text-[#5d6573]";

  return (
    <div className="flex min-h-screen flex-wrap bg-white text-[#15171c]">
      <main className="flex min-w-0 flex-[999_1_520px] flex-col justify-between gap-10 px-[clamp(24px,6vw,88px)] py-10">
        <div className="text-lg font-bold tracking-[-0.01em]">{productName}</div>

        <div className="w-full max-w-[400px]">
          {view === "form" && (
            <>
              <h1 className={title}>Willkommen zurück</h1>
              <p className={lead}>Melde dich mit deiner E-Mail-Adresse an.</p>

              <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-[18px]">
                <div className="flex flex-col gap-2">
                  <label htmlFor="pl-email" className="text-sm font-semibold">E-Mail</label>
                  <input
                    id="pl-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@beispiel.at"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value.trim()); clear(); }}
                    aria-invalid={field === "email"}
                    className={`${input} ${field === "email" ? "border-[#c4302b]" : "border-[#d5dae1]"}`}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <label htmlFor="pl-pw" className="text-sm font-semibold">Passwort</label>
                    <button type="button" onClick={sendLink} className="text-sm text-[#2f5bea] hover:text-[#1d44c4]">
                      Passwort vergessen?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="pl-pw"
                      type={showPw ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clear(); }}
                      aria-invalid={field === "pw"}
                      className={`${input} pr-[76px] ${field === "pw" ? "border-[#c4302b]" : "border-[#d5dae1]"}`}
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
                </div>

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
                  {loading ? "Wird angemeldet …" : "Anmelden"}
                </button>
              </form>

              <div className="my-7 flex items-center gap-3.5 text-sm text-[#5d6573]">
                <span className="h-px flex-1 bg-[#d5dae1]" />
                <span>oder</span>
                <span className="h-px flex-1 bg-[#d5dae1]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onGoogle} className={ghost}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
                    <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
                    <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
                  </svg>
                  Google
                </button>
                <button type="button" onClick={onApple} className={ghost}>
                  <svg aria-hidden="true" width="17" height="18" viewBox="0 0 17 20">
                    <path fill="#15171c" d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9A5 5 0 0 0 1 7.3c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.2 3-2.5a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.3-4.1zM11.6 3a4.4 4.4 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1c1.1.1 2.2-.5 2.9-1.4z" />
                  </svg>
                  Apple
                </button>
              </div>
            </>
          )}

          {view === "sent" && (
            <>
              <h1 className={title}>Schau in dein Postfach</h1>
              <p className={lead}>Wir haben einen Anmeldelink an {email} geschickt.</p>
              <button type="button" onClick={() => setView("form")} className={`${ghost} mt-8`}>
                Zurück zur Anmeldung
              </button>
            </>
          )}

          {view === "done" && (
            <>
              <h1 className={title}>Angemeldet</h1>
              <p className={lead}>Du wirst weitergeleitet.</p>
              <button type="button" onClick={() => setView("form")} className={`${ghost} mt-8`}>
                Nochmal von vorn
              </button>
            </>
          )}
        </div>

        <p className="m-0 text-sm text-[#5d6573]">
          Noch kein Konto?{" "}
          <a href={signUpHref} className="text-[#2f5bea] hover:text-[#1d44c4]">Konto erstellen</a>
        </p>
      </main>

      <aside className="hidden min-h-screen flex-[1_1_380px] flex-col justify-end bg-[#2f5bea] p-14 text-white min-[861px]:flex">
        <p className="m-0 max-w-[420px] text-[34px] leading-[1.12] font-bold tracking-[-0.02em]">{tagline}</p>
        <p className="mt-5 text-[15px] text-white/80">{productName}</p>
      </aside>
    </div>
  );
}

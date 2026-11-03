"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";

type LoginProps = {
  productName?: string;
  tagline?: string;
  /** Entscheidet nach der E-Mail, ob der Passwort- oder der Registrieren-Schritt kommt. */
  checkEmail?: (email: string) => Promise<"existing" | "new">;
  /** Die Handler werfen einen Error mit lesbarer Meldung, wenn etwas scheitert. */
  onLogin?: (email: string, password: string) => Promise<void>;
  onRegister?: (name: string, email: string, password: string) => Promise<void>;
  onMagicLink?: (email: string) => Promise<void>;
  onGoogle?: () => void;
  onApple?: () => void;
  privacyHref?: string;
  termsHref?: string;
  /** Merkt sich die zuletzt verwendete E-Mail-Adresse im Browser und füllt sie beim nächsten Mal vor. */
  rememberEmail?: boolean;
};

type Step = "email" | "password" | "register" | "sent" | "done" | "verify";
type Errors = Partial<Record<"email" | "name" | "pw" | "terms" | "form", string>>;

const MIN_PW = 8;
const STORAGE_KEY = "perfectlib:last-email";
const DOMAIN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com", "gmail.co": "gmail.com", "gamil.com": "gmail.com",
  "gmx.ar": "gmx.at", "gmx.att": "gmx.at", "gmx.de.": "gmx.de",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "outlok.com": "outlook.com", "outlook.co": "outlook.com",
  "icloud.co": "icloud.com", "iclod.com": "icloud.com", "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com",
};

// Demo-Verhalten, solange das Projekt keine eigenen Handler übergibt.
const demoAccounts = new Set(["clemens@beispiel.at"]);
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const normalizeEmail = (v: string) => v.trim().toLowerCase().replace(/[.,;]+$/, "");
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const suggestFor = (v: string) => {
  const [user, domain] = v.split("@");
  return user && domain && DOMAIN_TYPOS[domain] ? `${user}@${DOMAIN_TYPOS[domain]}` : "";
};
const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

const inputCls =
  "h-12 w-full rounded-[10px] border bg-white px-3.5 text-base text-[#15171c] outline-none focus:border-[#2f5bea] focus:ring-[3px] focus:ring-[#2f5bea]/20";
const ghostCls =
  "flex h-12 items-center justify-center gap-2.5 rounded-[10px] border border-[#d5dae1] bg-white px-5 text-[15px] font-semibold text-[#15171c] hover:bg-[#eef1f4] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#2f5bea]";
// Textlinks bleiben optisch klein, die Klickfläche ist aber mindestens 44 px hoch.
const textBtnCls =
  "-mx-2 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium text-[#2f5bea] hover:text-[#1d44c4] focus-visible:outline-2 focus-visible:outline-[#2f5bea]";
const titleCls = "m-0 text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em]";
const leadCls = "mt-3 text-base leading-normal text-[#5d6573]";

export default function LoginClemens({
  productName = "PerfectLib",
  tagline = "Ein Login, der einfach funktioniert.",
  checkEmail = async (email) => {
    await wait(500);
    return demoAccounts.has(email) ? "existing" : "new";
  },
  onLogin = () => wait(900),
  onRegister = async (_name, email) => {
    await wait(900);
    demoAccounts.add(email);
  },
  onMagicLink = () => wait(400),
  onGoogle,
  onApple,
  privacyHref = "#",
  termsHref = "#",
  rememberEmail = true,
}: LoginProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [remembered, setRemembered] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [suggestion, setSuggestion] = useState("");

  useEffect(() => {
    if (!rememberEmail) return;
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      if (last) {
        // Vorausfüllen nach dem Hydrieren, damit Server- und Client-HTML gleich bleiben.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEmail(last);
        setRemembered(true);
      }
    } catch {}
  }, [rememberEmail]);

  const pwOk = password.length >= MIN_PW;

  // Fehler erscheinen erst beim Verlassen eines Felds oder beim Absenden.
  // Steht ein Fehler schon da, wird bei jeder Eingabe neu geprüft, damit er verschwindet, sobald es passt.
  const validate = {
    email: (v = email) => (validEmail(v) ? "" : v ? "Diese E-Mail-Adresse ist unvollständig." : "Gib deine E-Mail-Adresse ein."),
    name: (v = name) => (v.trim() ? "" : "Gib deinen Namen ein."),
    pw: (v = password) =>
      !v ? "Gib ein Passwort ein." : step === "register" && v.length < MIN_PW ? `Mindestens ${MIN_PW} Zeichen.` : "",
    terms: (v = terms) => (v ? "" : "Ohne deine Zustimmung können wir kein Konto anlegen."),
  };

  function setError(key: keyof Errors, message: string) {
    setErrors((e) => ({ ...e, [key]: message || undefined, form: undefined }));
  }

  function recheck(key: keyof typeof validate, value: string | boolean) {
    if (errors[key]) setError(key, (validate[key] as (v: typeof value) => string)(value));
  }

  function go(next: Step) {
    setErrors({});
    setLoading(false);
    setStep(next);
  }

  function remember(value: string) {
    if (!rememberEmail) return;
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {}
  }

  async function run(action: () => Promise<void>, fallback: string) {
    setErrors({});
    setLoading(true);
    try {
      await action();
    } catch (err) {
      setErrors({ form: messageOf(err, fallback) });
    } finally {
      setLoading(false);
    }
  }

  function submitEmail(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const v = normalizeEmail(email);
    setEmail(v);
    const err = validate.email(v);
    if (err) return setError("email", err);
    setSuggestion("");
    return run(async () => {
      const kind = await checkEmail(v);
      setPassword("");
      setStep(kind === "existing" ? "password" : "register");
    }, "Wir konnten die Adresse gerade nicht prüfen. Versuch es nochmal.");
  }

  function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const err = validate.pw();
    if (err) return setError("pw", err);
    return run(async () => {
      await onLogin(email, password);
      remember(email);
      setStep("done");
    }, "Anmeldung fehlgeschlagen. Versuch es nochmal.");
  }

  function submitRegister(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    const next: Errors = { name: validate.name(), pw: validate.pw(), terms: validate.terms() };
    if (next.name || next.pw || next.terms) return setErrors(next);
    return run(async () => {
      await onRegister(name.trim(), email, password);
      remember(email);
      setStep("verify");
    }, "Das Konto konnte nicht erstellt werden. Versuch es nochmal.");
  }

  function sendLink() {
    return run(async () => {
      await onMagicLink(email);
      setStep("sent");
    }, "Der Link konnte nicht verschickt werden. Versuch es nochmal.");
  }

  function onPwKey(e: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(e.getModifierState("CapsLock"));
  }

  const border = (key: keyof Errors) => (errors[key] ? "border-[#c4302b]" : "border-[#d5dae1]");

  const emailChip = (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-[10px] bg-[#eef1f4] py-1 pr-3 pl-4">
      <span className="min-w-0 truncate text-[15px] font-medium">{email}</span>
      <button type="button" onClick={() => go("email")} className={textBtnCls}>
        Ändern
      </button>
    </div>
  );

  const passwordField = (autoComplete: string, describedBy?: string) => (
    <div className="relative">
      <input
        id="pl-pw"
        type={showPw ? "text" : "password"}
        autoComplete={autoComplete}
        autoFocus
        value={password}
        onChange={(e) => { setPassword(e.target.value); recheck("pw", e.target.value); }}
        onBlur={() => password && setError("pw", validate.pw())}
        onKeyDown={onPwKey}
        onKeyUp={onPwKey}
        aria-invalid={!!errors.pw}
        aria-describedby={[describedBy, errors.pw && "pl-pw-err"].filter(Boolean).join(" ") || undefined}
        className={`${inputCls} pr-[84px] ${border("pw")}`}
      />
      <button
        type="button"
        onClick={() => setShowPw(!showPw)}
        aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
        className="absolute top-0 right-0 h-12 min-w-[76px] rounded-r-[10px] px-3 text-sm font-semibold text-[#5d6573] hover:text-[#15171c] focus-visible:outline-2 focus-visible:outline-[#2f5bea]"
      >
        {showPw ? "Verbergen" : "Zeigen"}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-wrap bg-white text-[#15171c]">
      <main className="flex min-w-0 flex-[999_1_520px] flex-col justify-between gap-10 px-[clamp(24px,6vw,88px)] py-10">
        <div className="text-lg font-bold tracking-[-0.01em]">{productName}</div>

        <div className="w-full max-w-[400px]">
          {step === "email" && (
            <>
              <h1 className={titleCls}>{remembered ? "Willkommen zurück" : "Anmelden oder registrieren"}</h1>
              <p className={leadCls}>
                {remembered
                  ? "Deine E-Mail-Adresse ist schon eingetragen."
                  : "Gib deine E-Mail-Adresse ein. Wir erkennen, ob du schon ein Konto hast."}
              </p>

              <form onSubmit={submitEmail} noValidate className="mt-8 flex flex-col gap-[18px]">
                <Field id="pl-email" label="E-Mail" error={errors.email}>
                  <input
                    id="pl-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="name@beispiel.at"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setSuggestion(""); recheck("email", normalizeEmail(e.target.value)); }}
                    onBlur={() => {
                      const v = normalizeEmail(email);
                      setEmail(v);
                      if (v) setError("email", validate.email(v));
                      setSuggestion(suggestFor(v));
                    }}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "pl-email-err" : undefined}
                    className={`${inputCls} ${border("email")}`}
                  />
                  {suggestion && (
                    <p className="m-0 text-sm text-[#5d6573]">
                      Meintest du{" "}
                      <button type="button" onClick={() => { setEmail(suggestion); setSuggestion(""); setError("email", ""); }} className={textBtnCls}>
                        {suggestion}
                      </button>
                      ?
                    </p>
                  )}
                </Field>

                <FormError message={errors.form} />
                <PrimaryButton loading={loading} label="Weiter" loadingLabel="Einen Moment …" />
              </form>

              <div className="my-7 flex items-center gap-3.5 text-sm text-[#5d6573]">
                <span className="h-px flex-1 bg-[#d5dae1]" />
                <span>oder weiter mit</span>
                <span className="h-px flex-1 bg-[#d5dae1]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onGoogle} className={ghostCls}>
                  <GoogleIcon />
                  Google
                </button>
                <button type="button" onClick={onApple} className={ghostCls}>
                  <AppleIcon />
                  Apple
                </button>
              </div>
            </>
          )}

          {step === "password" && (
            <>
              {emailChip}
              <h1 className={titleCls}>Passwort eingeben</h1>
              <form onSubmit={submitPassword} noValidate className="mt-8 flex flex-col gap-[18px]">
                <Field id="pl-pw" label="Passwort" error={errors.pw}>
                  {passwordField("current-password")}
                  {capsLock && <CapsLockHint />}
                </Field>
                <FormError message={errors.form} />
                <PrimaryButton loading={loading} label="Anmelden" loadingLabel="Wird angemeldet …" />
              </form>
              <p className="mt-5 mb-0 text-sm text-[#5d6573]">
                Passwort vergessen?{" "}
                <button type="button" onClick={sendLink} className={textBtnCls}>
                  Anmeldelink per Mail schicken
                </button>
              </p>
            </>
          )}

          {step === "register" && (
            <>
              {emailChip}
              <h1 className={titleCls}>Konto erstellen</h1>
              <p className={leadCls}>Für diese Adresse gibt es noch kein Konto. Zwei Angaben, dann bist du drin.</p>
              <form onSubmit={submitRegister} noValidate className="mt-8 flex flex-col gap-[18px]">
                <Field id="pl-name" label="Name" error={errors.name}>
                  <input
                    id="pl-name"
                    type="text"
                    autoComplete="name"
                    autoFocus
                    value={name}
                    onChange={(e) => { setName(e.target.value); recheck("name", e.target.value); }}
                    onBlur={() => name && setError("name", validate.name())}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "pl-name-err" : undefined}
                    className={`${inputCls} ${border("name")}`}
                  />
                </Field>

                <Field id="pl-pw" label="Passwort" error={errors.pw}>
                  {passwordField("new-password", "pl-pw-rule")}
                  {capsLock && <CapsLockHint />}
                  <p id="pl-pw-rule" className={`m-0 flex items-center gap-2 text-[13px] ${pwOk ? "text-[#13795b]" : "text-[#5d6573]"}`}>
                    <CheckIcon on={pwOk} />
                    Mindestens {MIN_PW} Zeichen
                  </p>
                </Field>

                <div className="flex flex-col gap-1.5">
                  <label className="flex cursor-pointer items-start gap-3 py-1 text-sm leading-[1.45] text-[#5d6573]">
                    <input
                      type="checkbox"
                      checked={terms}
                      onChange={(e) => { setTerms(e.target.checked); recheck("terms", e.target.checked); }}
                      aria-invalid={!!errors.terms}
                      aria-describedby={errors.terms ? "pl-terms-err" : undefined}
                      className="mt-px h-5 w-5 shrink-0 accent-[#2f5bea]"
                    />
                    <span>
                      Ich habe die <a href={privacyHref} className="text-[#2f5bea] hover:text-[#1d44c4]">Datenschutzerklärung</a>{" "}
                      gelesen und stimme den <a href={termsHref} className="text-[#2f5bea] hover:text-[#1d44c4]">Nutzungsbedingungen</a> zu.
                    </span>
                  </label>
                  <InlineError id="pl-terms-err" message={errors.terms} />
                </div>

                <FormError message={errors.form} />
                <PrimaryButton loading={loading} label="Konto erstellen" loadingLabel="Konto wird erstellt …" />
              </form>
            </>
          )}

          {step === "sent" && (
            <Message
              title="Schau in dein Postfach"
              text={`Wir haben einen Anmeldelink an ${email} geschickt. Ein Klick darauf meldet dich an.`}
              action="Zurück"
              onAction={() => go("password")}
            />
          )}

          {step === "verify" && (
            <Message
              title="Bestätige deine E&#8209;Mail"
              text={`Wir haben einen Bestätigungslink an ${email} geschickt. Sobald du ihn öffnest, ist dein Konto aktiv.`}
              action="Andere E-Mail verwenden"
              onAction={() => go("email")}
            />
          )}

          {step === "done" && (
            <Message title="Angemeldet" text="Du wirst weitergeleitet." action="Nochmal von vorn" onAction={() => go("email")} />
          )}
        </div>

        <span aria-hidden />
      </main>

      <aside className="hidden min-h-screen flex-[1_1_380px] flex-col justify-end bg-[#2f5bea] p-14 text-white min-[861px]:flex">
        <p className="m-0 max-w-[420px] text-[34px] leading-[1.12] font-bold tracking-[-0.02em]">{tagline}</p>
        <p className="mt-5 text-[15px] text-white/80">{productName}</p>
      </aside>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">{label}</label>
      {children}
      <InlineError id={`${id}-err`} message={error} />
    </div>
  );
}

function InlineError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="m-0 flex items-start gap-2 text-sm leading-[1.4] text-[#a3201b]">
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" className="mt-0.5 shrink-0">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.5v4.2M8 11v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {message}
    </p>
  );
}

function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="m-0 rounded-[10px] bg-[#fdecec] px-3.5 py-3 text-sm leading-[1.45] text-[#a3201b]">
      {message}
    </p>
  );
}

function CapsLockHint() {
  return <p className="m-0 text-[13px] font-medium text-[#8a5a00]">Feststelltaste ist aktiv.</p>;
}

function PrimaryButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      aria-busy={loading}
      className="mt-1.5 flex h-[50px] items-center justify-center gap-2.5 rounded-[10px] bg-[#2f5bea] text-base font-bold text-white hover:bg-[#2650d6] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[#2f5bea] aria-busy:opacity-80"
    >
      {loading && (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" className="animate-spin motion-reduce:animate-none">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {loading ? loadingLabel : label}
    </button>
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

function CheckIcon({ on }: { on: boolean }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="7" fill={on ? "#13795b" : "none"} stroke={on ? "#13795b" : "#9aa3b2"} strokeWidth="1.5" />
      {on && <path d="M5 8.2l2 2 4-4.4" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" width="17" height="18" viewBox="0 0 17 20">
      <path fill="#15171c" d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9A5 5 0 0 0 1 7.3c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.3 0 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.2 3-2.5a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.3-4.1zM11.6 3a4.4 4.4 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1c1.1.1 2.2-.5 2.9-1.4z" />
    </svg>
  );
}

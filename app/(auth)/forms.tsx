"use client";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Loader2, Mail, MailCheck } from "lucide-react";
import { choosePassword, claimQuote, emailLinkSignIn, requestMagicLink, requestReset, signIn, signUp, type FormState } from "./actions";

// Password managers (iCloud Keychain, Google Password Manager, Samsung Pass, 1Password…) recognise these forms by:
// a real <form>, inputs with name + id, autocomplete="username" / "current-password" / "new-password",
// the email shown next to every new-password field, and a page navigation after a successful submit.

const input = "block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-[15px] text-[#071a33] shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-[#071a33] focus:ring-4 focus:ring-[#f5b400]/30 aria-[invalid=true]:border-red-400";
const label = "mb-1.5 block text-sm font-semibold text-[#071a33]";

function Field({ id, label: l, error, hint, children, right }: { id: string; label: string; error?: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between"><label htmlFor={id} className={label}>{l}</label>{right}</div>
      {children}
      {error ? <p id={`${id}-error`} className="mt-1.5 text-sm text-red-700">{error}</p> : hint ? <p className="mt-1.5 text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

function EmailInput({ defaultValue, error, readOnly, autoFocus }: { defaultValue?: string; error?: string; readOnly?: boolean; autoFocus?: boolean }) {
  return <input id="email" name="email" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required
    defaultValue={defaultValue} readOnly={readOnly} autoFocus={autoFocus} aria-invalid={!!error} aria-describedby={error ? "email-error" : undefined} placeholder="you@example.com"
    className={`${input} ${readOnly ? "bg-neutral-50 text-neutral-600" : ""}`} />;
}

function PasswordInput({ id = "password", kind, error, rules }: { id?: string; kind: "current" | "new"; error?: string; rules?: string }) {
  const [show, setShow] = useState(false);
  const [value, setValue] = useState("");
  return (
    <>
      <div className="relative">
        <input id={id} name="password" type={show ? "text" : "password"} autoComplete={kind === "new" ? "new-password" : "current-password"} required minLength={kind === "new" ? 10 : 1} maxLength={200}
          {...(rules ? { passwordrules: rules } : {})} value={value} onChange={e => setValue(e.target.value)}
          aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={`${input} pr-12`} placeholder={kind === "new" ? "At least 10 characters" : "Your password"} />
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}
          className="absolute inset-y-0 right-0 grid w-12 place-items-center text-neutral-500 hover:text-[#071a33]">{show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
      </div>
      {kind === "new" && <Strength value={value} />}
    </>
  );
}

/** A friendly strength guide (length matters most). */
function Strength({ value }: { value: string }) {
  const checks = [
    { ok: value.length >= 10, t: "10+ characters" },
    { ok: /[a-z]/.test(value) && /[A-Z]/.test(value), t: "upper & lower case" },
    { ok: /\d/.test(value), t: "a number" },
    { ok: /[^A-Za-z0-9]/.test(value) || value.length >= 16, t: "a symbol (or 16+ characters)" },
  ];
  const score = checks.filter(c => c.ok).length + (value.length >= 14 ? 1 : 0);
  const word = !value ? "" : score <= 2 ? "Weak" : score === 3 ? "Fair" : score === 4 ? "Good" : "Strong";
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1">{[0, 1, 2, 3, 4].map(i => <span key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? (score <= 2 ? "bg-red-400" : score === 3 ? "bg-amber-400" : "bg-emerald-500") : "bg-neutral-200"}`} />)}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        {word && <span className="font-semibold text-[#071a33]">{word}</span>}
        {checks.map(c => <span key={c.t} className={`inline-flex items-center gap-1 ${c.ok ? "text-emerald-700" : ""}`}><Check className={`h-3 w-3 ${c.ok ? "" : "opacity-30"}`} />{c.t}</span>)}
      </div>
      <p className="mt-1 text-xs text-neutral-500">Tip: let your phone or browser suggest a strong password – it's saved for you automatically.</p>
    </div>
  );
}

function Submit({ children, variant = "primary", formAction }: { children: ReactNode; variant?: "primary" | "secondary"; formAction?: (fd: FormData) => void }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" formAction={formAction} disabled={pending}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[15px] font-bold transition disabled:opacity-60 ${variant === "primary" ? "bg-[#071a33] text-white hover:bg-[#0d2a4f]" : "border border-neutral-300 bg-white text-[#071a33] hover:border-[#071a33]"}`}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}{children}
    </button>
  );
}

function Message({ state }: { state: FormState }) {
  if (!state.message) return null;
  return <p role="alert" className={`rounded-xl px-4 py-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{state.message}</p>;
}

export function GoogleButton({ next, label: l = "Continue with Google", enabled }: { next?: string; label?: string; enabled: boolean }) {
  if (!enabled) return null;
  return (
    <a href={`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`}
      className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-neutral-300 bg-white px-5 py-3.5 text-[15px] font-semibold text-[#071a33] shadow-sm transition hover:border-[#071a33] hover:bg-neutral-50">
      <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
      {l}
    </a>
  );
}
export const Divider = ({ text = "or" }: { text?: string }) => <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-neutral-400"><span className="h-px flex-1 bg-neutral-200" />{text}<span className="h-px flex-1 bg-neutral-200" /></div>;

function Sent({ email, title = "Check your email", children }: { email?: string; title?: string; children?: ReactNode }) {
  return (
    <div className="space-y-4 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f5b400]/15 text-[#071a33]"><MailCheck className="h-7 w-7" /></span>
      <h2 className="text-xl font-bold text-[#071a33]">{title}</h2>
      <p className="text-sm text-neutral-600">If <strong>{email}</strong> can be used, we've sent a link to it. It can take a minute – check your spam folder too.</p>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- Sign in

export function LoginForm({ next, google, initialEmail = "" }: { next: string; google: boolean; initialEmail?: string }) {
  const [state, action] = useActionState(signIn, { email: initialEmail });
  const [magic, magicAction] = useActionState(requestMagicLink, {});
  if (magic.sent) return <Sent email={magic.email} title="Your sign-in link is on its way"><p className="text-xs text-neutral-500">The link works for 15 minutes.</p></Sent>;
  return (
    <div className="space-y-5">
      <GoogleButton next={next} enabled={google} />
      {google && <Divider />}
      <form action={action} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <Message state={state} /><Message state={magic} />
        <Field id="email" label="Email" error={state.errors?.email ?? magic.errors?.email}><EmailInput defaultValue={state.email} error={state.errors?.email} autoFocus={!initialEmail} /></Field>
        <Field id="password" label="Password" error={state.errors?.password} right={<Link href="/forgot-password" className="text-sm font-semibold text-[#071a33] underline-offset-4 hover:underline">Forgot password?</Link>}>
          <PasswordInput kind="current" error={state.errors?.password} />
        </Field>
        <Submit>Sign in <ArrowRight className="h-4 w-4" /></Submit>
        <Submit variant="secondary" formAction={magicAction}><Mail className="h-4 w-4" />Email me a sign-in link instead</Submit>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Create account

export function SignupForm({ google, next }: { google: boolean; next: string }) {
  const [state, action] = useActionState(signUp, {});
  if (state.sent) return <Sent email={state.email} title="Confirm your email"><p className="text-sm text-neutral-600">Click the link in the email to choose your password and finish creating your account.</p></Sent>;
  return (
    <div className="space-y-5">
      <GoogleButton next={next} label="Sign up with Google" enabled={google} />
      {google && <Divider />}
      <form action={action} className="space-y-4" noValidate>
        <Message state={state} />
        <Field id="name" label="Full name" error={state.errors?.name}><input id="name" name="name" autoComplete="name" required className={input} placeholder="Jane Smith" aria-invalid={!!state.errors?.name} /></Field>
        <Field id="email" label="Email" error={state.errors?.email} hint="Use the email we send your quotes to."><EmailInput error={state.errors?.email} defaultValue={state.email} /></Field>
        <Field id="phone" label="Mobile (optional)" error={state.errors?.phone}><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" className={input} placeholder="07…" aria-invalid={!!state.errors?.phone} /></Field>
        <label className="flex items-start gap-3 text-sm text-neutral-600">
          <input type="checkbox" name="terms" required className="mt-0.5 h-5 w-5 shrink-0 rounded accent-[#071a33]" />
          <span>I agree to the <Link href="/terms" className="font-semibold text-[#071a33] underline">terms</Link> and <Link href="/privacy" className="font-semibold text-[#071a33] underline">privacy notice</Link>.</span>
        </label>
        {state.errors?.terms && <p className="text-sm text-red-700">{state.errors.terms}</p>}
        <Submit>Create account <ArrowRight className="h-4 w-4" /></Submit>
        <p className="text-center text-xs text-neutral-500">Next we'll email you a link to confirm your address and choose a password.</p>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------- Forgot password

export function ForgotForm() {
  const [state, action] = useActionState(requestReset, {});
  if (state.sent) return <Sent email={state.email} title="Check your email"><p className="text-sm text-neutral-600">The link to choose a new password works for 1 hour.</p></Sent>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Message state={state} />
      <Field id="email" label="Email" error={state.errors?.email}><EmailInput error={state.errors?.email} defaultValue={state.email} autoFocus /></Field>
      <Submit><KeyRound className="h-4 w-4" />Send me a link</Submit>
    </form>
  );
}

// ---------------------------------------------------------------- Choose a password (verify / invite / reset)

export function ChoosePasswordForm({ token, email, rules, cta = "Save password & sign in" }: { token: string; email: string; rules: string; cta?: string }) {
  const [state, action] = useActionState(choosePassword, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <Message state={state} />
      {/* The email sits next to the new password so the password manager saves both together. */}
      <Field id="email" label="Email"><EmailInput defaultValue={email} readOnly /></Field>
      <Field id="password" label="New password" error={state.errors?.password}><PasswordInput kind="new" rules={rules} error={state.errors?.password} /></Field>
      <Submit>{cta} <ArrowRight className="h-4 w-4" /></Submit>
    </form>
  );
}

// ---------------------------------------------------------------- Sign in from an emailed link

export function EmailLinkForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(emailLinkSignIn, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Message state={state} />
      <p className="text-center text-sm text-neutral-600">Signing in as <strong>{email}</strong></p>
      <Submit>Sign in <ArrowRight className="h-4 w-4" /></Submit>
    </form>
  );
}

// ---------------------------------------------------------------- Quote reference + postcode

export function ClaimForm() {
  const [state, action] = useActionState(claimQuote, {});
  if (state.sent) return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Found it. We've emailed a sign-in link to <strong>{state.email}</strong> – the address your quote was sent to.</p>;
  return (
    <form action={action} className="space-y-3" noValidate>
      <Message state={state} />
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <input name="reference" aria-label="Quote reference" placeholder="Reference, e.g. Q-261110-AB12" autoCapitalize="characters" autoComplete="off" className={input} />
        <input name="postcode" aria-label="Site postcode" placeholder="Postcode" autoComplete="postal-code" autoCapitalize="characters" className={input} />
      </div>
      {state.errors?.reference && <p className="text-sm text-red-700">{state.errors.reference}</p>}
      <Submit variant="secondary">Email me a sign-in link</Submit>
    </form>
  );
}

# Sign-in (our own – replaces Kinde)

People sign in on our own pages: `/login`, `/signup`, `/forgot-password`, `/account`. Kinde is no longer used
(the old `/api/auth/login`, `/register`, `/logout` links redirect to the new pages; the Kinde package can be
uninstalled later).

## Ways to sign in

- **Email + password.** Passwords are hashed with scrypt (Node's built-in crypto); we never store them.
- **Continue with Google** (needs `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).
- **Email me a sign-in link** – no password needed (15 minutes, one use).
- **Quote reference + postcode** – emails a sign-in link to the address the quote was sent to.

New accounts give their name and email first. We email a link to confirm the address, and they choose their
password on that page. Nobody can set a password for an email they don't own.

Existing customers from the old Kinde sign-in use "Forgot password" (or Google, or an email link) once. Their
account is matched by email to the existing `User` record, so their projects stay linked.

## Roles

| Role | Who | Home after sign-in |
| --- | --- | --- |
| Admin | emails in `ADMIN_EMAILS` (email must be confirmed) | `/dashboard` |
| Staff / PM | invited on Dashboard → Accounts | `/trade` |
| Trade | invited on Dashboard → Accounts, with their trade | `/trade` |
| Client | sign up themselves, or invited | `/my-quotes` |

Admins can switch any account off (it is signed out everywhere), change roles and send password links. Nothing is deleted.

## Saving passwords on iPhone, Android and Chrome

The forms are built for password managers:

- They use real forms with `autocomplete="username"`, `current-password` and `new-password`.
- The email is shown next to every new password, so the manager saves the two together.
- Safari / iCloud Keychain gets `passwordrules`, so it suggests a strong password.
- `/.well-known/change-password` takes managers straight to the change-password form.

iPhone (iCloud Keychain), Android / Chrome (Google Password Manager), Samsung Pass and 1Password offer to save the
password and fill it in next time.

## Security

- **Session cookie:** `__Host-2a_session` (httpOnly, Secure, SameSite=Lax). Only its SHA-256 is stored.
- **Session lifetime:** 30 days, extended by use, at most 90 days.
- **Password change:** a new password signs out every other device.
- **Email links:** opening a link doesn't use it up; pressing the button does, so email scanners can't burn it. Each link works once.
- **Rate limits:**
  - 8 failed sign-ins per email or IP address within 15 minutes.
  - At most 5 emails to the same address per hour.
  - 10 quote-reference tries per IP address per hour.
- **No account fishing:** "check your email" is shown whether or not an account exists, so nobody can tell who our customers are.
- **Redirects** after sign-in only go to pages on our own site.

## Setup

1. **Database:** apply migration `20261111120000_add_accounts` (new tables only) with `npx prisma migrate deploy`.
2. **Email:** the SMTP settings must be set – sign-up, password links and email sign-in need them.
3. **Site address:** `NEXT_PUBLIC_SITE_URL=https://www.your-domain.co.uk`, used in the links in emails.
4. **Google:**
   1. Google Cloud console → APIs & Services → OAuth consent screen (External; app name "2A Construction"; your logo).
   2. Credentials → Create credentials → OAuth client ID → Web application.
   3. Authorised redirect URIs: `https://www.your-domain.co.uk/api/auth/google/callback` (and `http://localhost:3000/api/auth/google/callback` for local testing).
   4. Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
5. **Kinde:** you can remove the `KINDE_*` environment variables once the new sign-in is live.

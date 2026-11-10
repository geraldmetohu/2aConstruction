# Release checklist – quotes, client portal, sign-in, invoices

## Before pushing
1. `npm run build` locally – it must finish without errors (it also type-checks).
2. Database: migrations are additive only. Applied with `npx prisma migrate deploy`:
   - `20261110120000_more_suppliers`
   - `20261111120000_add_accounts`
   - `20261112120000_client_portal`
   Never run `prisma db push`, `migrate dev` or `migrate reset` against the live database (it is shared).
3. `.env` is git-ignored – never commit it.

## Vercel → Settings → Environment Variables
| Name | Notes |
|---|---|
| `DATABASE_URL` | as before |
| `NEXT_PUBLIC_SITE_URL` | `https://2aconstruction.co.uk` (links in emails) |
| `ADMIN_EMAILS` | comma-separated; these accounts are admins once their email is confirmed |
| `CONTACT_TO` | office inbox for enquiries, office copies of quotes / invoices and client notifications |
| `RESEND_API_KEY` | every email goes through Resend |
| `RESEND_FROM` (or `MAIL_FROM`) | e.g. `2A Construction <quotes@2aconstruction.co.uk>` – domain verified in Resend |
| `CRON_SECRET` | random 64-character value; Vercel sends it to the cron routes |
| `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID`, `UPLOADTHING_TOKEN` | as before |
| `REDIS_URL`, `REDIS_TOKEN` | as before |
| `KINDE_*` | no longer used – can be removed |

Redeploy after changing variables.

## Scheduled jobs (vercel.json)
- `/api/jobs/daily` – every day 06:30 UTC: office digest, client reminders, invoices that have fallen due.
- `/api/takeoff/prices/refresh` – 1st and 2nd of the month 04:00 UTC: merchant prices.

## Automatic emails
| When | To |
|---|---|
| Account: confirm email, sign-in link, password reset, invite | the person |
| Quote sent (PDF attached) | client, office copy with PDF |
| Quote updated after sending | client |
| Quote accepted | client (thank you) and office |
| Start date set or changed | client |
| Work started / on hold / completed (with snagging + review ask) | client |
| A stage marked done | client |
| Message from us | client |
| Message or note from the client | office |
| Question / decision / variation for the client | client |
| Client answer, variation approved or declined | office |
| Client reports a payment | office |
| Payment confirmed / not found / recorded by us | client |
| Invoice raised (PDF attached) – deposit, stages, final | client, office copy with PDF |
| Snag raised or reopened by the client | office |
| Snag fixed by us | client |
| Documents shared, photos shared (max one email a day) | client |
| Project manager named | client |
| Items the client supplies ordered / delivered | office |
| Daily digest and reminders | office, clients |
| Website enquiry | office |

Client emails about a job are only sent once the quote is accepted.

## After deploying – quick test
1. Create an account with a test email → confirm email → set password → sign in.
2. Make a quote in the calculator → Send → check the client email (PDF) and the office copy.
3. Accept as the client with a preferred start date → office gets the acceptance.
4. In Jobs: confirm the start date, post a message, add a snag, mark a stage done → client emails.
5. Money tab: the deposit invoice appears and is emailed with the PDF; client presses "I've paid this" → office email → Confirm received → client email.
6. On a phone: the portal tab bar, the "More" sheet and the menu's "Your area" links.

"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCatalogueAdmin } from "@/app/lib/catalogue/access";
import { db } from "@/app/lib/auth/session.server";
import { hashPassword } from "@/app/lib/auth/password";
import { accountByEmail, authReady, createAccount, updateAccount } from "@/app/lib/auth/store";
import { acceptQuote, getQuote, StoreError } from "@/app/lib/takeoff/store";
import { loadJob } from "@/app/lib/takeoff/jobs.server";
import { siteUrl } from "@/app/lib/takeoff/mail.server";
import { addDaysIso, londonDay } from "@/app/lib/takeoff/jobs";
import { deleteProject, deletesEnabled } from "@/app/lib/takeoff/delete-store";
import { allDemoQuotes, createDemoQuote, demoDone, demoQuoteId, DEMO_EMAIL, DEMO_NAME, DEMO_STEPS, markDemoStep } from "@/app/lib/takeoff/demo.server";
import { sendTakeoffQuote } from "../calculator/actions";
import {
  addClientActionAction, addPhotosAction, addSnagAction, postMessageAction, recordPaymentAction, setManagerAction, setStageAction, updateJobAction, updatePhotoAction,
} from "../jobs/actions";

type Result = { ok: true; message: string } | { ok: false; message: string };
const fail = (e: unknown): Result => ({ ok: false, message: e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : e instanceof Error ? e.message : "Something went wrong." });
const refresh = (id?: string | null) => { revalidatePath("/dashboard/demo"); revalidatePath("/dashboard/jobs"); revalidatePath("/dashboard/saved-quotes"); if (id) { revalidatePath(`/dashboard/jobs/${id}`); revalidatePath(`/my-quotes/${id}`); } };
const must = <T extends { ok: boolean }>(r: T) => { if (!r.ok) throw new StoreError((r as unknown as { message: string }).message); return r; };

/** Create or update the demo client's login with the password you type. */
export async function setupDemoLogin(password: string): Promise<Result> {
  try {
    await requireCatalogueAdmin();
    const d = db();
    if (!(await authReady(d))) throw new StoreError("Logins need migration 20261111120000_add_accounts.");
    const pw = z.string().min(8, "Use at least 8 characters").max(200).parse(password);
    const hash = await hashPassword(pw);
    const a = await accountByEmail(d, DEMO_EMAIL);
    if (!a) await createAccount(d, { email: DEMO_EMAIL, name: DEMO_NAME, phone: "07700 900123", role: "CLIENT", verified: true, passwordHash: hash });
    else await updateAccount(d, a.id, { passwordHash: hash, verified: true, disabled: false, role: "CLIENT", ...(a.name ? {} : { name: DEMO_NAME }) });
    if (!(await demoQuoteId(d))) await createDemoQuote(d);
    refresh();
    return { ok: true, message: `Demo login ready: ${DEMO_EMAIL}. Sign in with it in a private window to see the client's side.` };
  } catch (e) { return fail(e); }
}

/** Run the next step of the story. */
export async function runDemoStep(n: number): Promise<Result> {
  try {
    const actor = await requireCatalogueAdmin();
    const d = db();
    let id = await demoQuoteId(d);
    if (!id) id = await createDemoQuote(d);
    const done = await demoDone(d, id);
    if (n !== done + 1) throw new StoreError(done >= DEMO_STEPS.length ? "The story is finished – reset the demo to start again." : `Run step ${done + 1} first.`);
    await STEPS[n](id, actor);
    await markDemoStep(d, id, n, actor);
    refresh(id);
    return { ok: true, message: `Step ${n} done – ${DEMO_STEPS[n - 1].title}.` };
  } catch (e) { return fail(e); }
}

/** Delete the demo project(s) completely and start a fresh draft. The demo login is kept. */
export async function resetDemo(typed: string): Promise<Result> {
  try {
    await requireCatalogueAdmin();
    if (typed.trim() !== "RESET") throw new StoreError("Type RESET to confirm.");
    const d = db();
    if (!(await deletesEnabled(d))) throw new StoreError("Reset needs the database update 20261117120000_confirmed_deletes – apply it first.");
    for (const q of await allDemoQuotes(d)) await deleteProject(d, q);
    await createDemoQuote(d);
    refresh();
    return { ok: true, message: "Demo reset – a fresh draft quote is ready for step 1." };
  } catch (e) { return fail(e); }
}

/* ------------------------------------------------------------------ The steps */

const today = () => londonDay(new Date());
const photo = (file: string) => `${siteUrl() || "https://www.example.com"}/images/${file}`;

/** Tick off stages up to a share of the programme; the next one is set "in progress". */
async function progressTo(id: string, share: number, note: string) {
  const job = await loadJob(id);
  if (!job) throw new StoreError("Demo job not found.");
  const stages = job.progress.stages, upTo = Math.min(stages.length, Math.round(stages.length * share));
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    if (i < upTo && s.status !== "DONE") must(await setStageAction(id, { stage: s.stage, label: s.label, status: "DONE", percent: 100, note: i === upTo - 1 ? note : "" }));
    else if (i === upTo && s.status === "NOT_STARTED") must(await setStageAction(id, { stage: s.stage, label: s.label, status: "IN_PROGRESS", percent: 35, note: "" }));
  }
}
async function sharePhotos(id: string, files: [string, string][], stage: string) {
  must(await addPhotosAction(id, files.map(([f, caption]) => ({ url: photo(f), caption, stage }))));
  const job = await loadJob(id);
  for (const p of (job?.photos ?? []).filter(p => !p.visibleToClient).slice(0, files.length)) must(await updatePhotoAction(id, p.id, { visibleToClient: true }));
}

const STEPS: Record<number, (id: string, actor: string) => Promise<void>> = {
  1: async id => { must(await sendTakeoffQuote(id)); },
  2: async id => {
    const q = await getQuote(db(), id);
    if (!q) throw new StoreError("Demo quote not found.");
    if (q.quote.status === "SENT") await acceptQuote(db(), id, DEMO_EMAIL, q.quote.publishedVersion ?? q.quote.currentVersion, DEMO_NAME);
  },
  3: async id => {
    must(await setManagerAction(id, { name: "Alex (site manager)", phone: "07700 900456", email: "" }));
    must(await updateJobAction(id, { startDate: addDaysIso(today(), 7) }));
    must(await postMessageAction(id, "Welcome to your project portal! You'll see every stage, photo, invoice and question here. Alex is your site manager – call or message any time.", false));
  },
  4: async id => {
    must(await addClientActionAction(id, { kind: "DECISION", title: "Choose your en-suite tiles", detail: "Please pick floor and wall tiles (or tell us to choose a neutral porcelain). We need it two weeks before tiling.", dueDate: addDaysIso(today(), 10) }));
    must(await addClientActionAction(id, { kind: "ACCESS", title: "Parking for the skip", detail: "Can the skip go on your drive, or do we need a council permit for the road?", dueDate: addDaysIso(today(), 3) }));
  },
  5: async id => {
    const job = await loadJob(id); // raises the deposit invoice automatically
    const dep = job?.money.rows.find(r => r.n === 1);
    if (dep && dep.balance > 0) must(await recordPaymentAction(id, { scheduleNo: 1, amount: dep.balance, method: "BANK_TRANSFER", reference: "DEMO DEPOSIT", paidOn: today(), note: "Demo payment" }));
  },
  6: async id => {
    must(await updateJobAction(id, { status: "IN_PROGRESS", startDate: today() }));
    await progressTo(id, 0.15, "Scaffold up and the house protected.");
    await sharePhotos(id, [["build.jpg", "Scaffold up – day 1"], ["site_insp.jpg", "Site set-up"]], "Site");
  },
  7: async id => {
    await progressTo(id, 0.4, "Steels in to the engineer's design; Building Control inspected and happy.");
    must(await postMessageAction(id, "Good news – the steels are in and Building Control signed off the structure today.", false));
  },
  8: async id => {
    await progressTo(id, 0.6, "Roof covered, dormer clad and windows in – watertight.");
    must(await addClientActionAction(id, { kind: "VARIATION", title: "Extra double socket with USB by the bed", detail: "You asked for an extra socket in bedroom 2.", dueDate: addDaysIso(today(), 5), price: 95, vatPercent: 20 }));
    await sharePhotos(id, [["roof.jpg", "Roof watertight"]], "Roof");
  },
  9: async id => {
    await progressTo(id, 0.9, "Plastered, en-suite tiled, stairs fitted – decorating next.");
    must(await postMessageAction(id, "We're on the home straight – decorating this week, then we walk round with you for the snag list.", false));
    await sharePhotos(id, [["loft.jpg", "Loft bedroom plastered"]], "Fit-out");
  },
  10: async id => {
    must(await addSnagAction(id, { title: "Touch up paint on landing", detail: "Small scuff by the door frame.", location: "Landing", photoUrl: "" }));
    must(await addSnagAction(id, { title: "Ease the en-suite door", detail: "Catches on the frame at the top.", location: "En-suite", photoUrl: "" }));
  },
  11: async id => {
    await progressTo(id, 1, "All done and signed off by Building Control.");
    must(await updateJobAction(id, { status: "COMPLETED" }));
    must(await postMessageAction(id, "Your loft is finished – thank you! Your guarantee and completion certificate are in Documents.", false));
  },
};

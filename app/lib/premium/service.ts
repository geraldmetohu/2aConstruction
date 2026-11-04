import "server-only";
import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { z } from "zod";
import { calculateEstimate, canonicalJson, customerEstimate, ENGINE_VERSION } from "@/app/lib/pricing/engine";
import { loadPricingCatalogue } from "@/app/lib/pricing/catalogue";
import { mapRequirements, WorkMapping } from "./mapping";
import { requirementsSchema } from "./requirements";
import { PremiumError } from "./errors";

export { PremiumError } from "./errors";
const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v));
const digest = (v: unknown) => createHash("sha256").update(canonicalJson(v)).digest("hex");
const uniqueConflict = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
export function createPremiumService(db: PrismaClient, stripe: Stripe, origin: string, mapping: WorkMapping, liveMode: boolean) {
  async function checkout(ownerId: string, raw: unknown, rawKey: unknown) {
    const requirements = requirementsSchema.parse(raw);
    const requestKey = z.string().uuid().parse(rawKey);
    const requirementsHash = digest(requirements);
    let request = await db.premiumRequest.findUnique({ where: { ownerId_requestKey: { ownerId, requestKey } } });
    if (request && request.requirementsHash !== requirementsHash) throw new PremiumError("Your answers changed. Return to review and start a new checkout.");
    if (!request) {
      const now = new Date();
      const pricingInput = mapRequirements(requirements, mapping, now.toISOString());
      const { catalogue, fee } = await db.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return loadPricingCatalogue(tx, now);
      }, { isolationLevel: "RepeatableRead", timeout: 30000 });
      for (const line of pricingInput.lines) if (line.type === "ITEM" && line.quantity.kind === "EXPLICIT") {
        const item = catalogue.items.find(i => i.id === line.itemId);
        const unit = catalogue.units.find(u => u.id === item?.unitId);
        if (unit?.dimensionKind !== "COUNT") throw new PremiumError("A count-based specification needs its catalogue unit reviewed before payment.");
      }
      // Validate that the frozen scope is priceable before taking any payment.
      // The actual saved estimate is generated only after a payment is recorded.
      calculateEstimate(pricingInput, catalogue);
      request = await db.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`premium:${ownerId}`}))`;
        const existing = await tx.premiumRequest.findUnique({ where: { ownerId_requestKey: { ownerId, requestKey } } });
        if (existing) {
          if (existing.requirementsHash !== requirementsHash) throw new PremiumError("Your answers changed. Please review them again.");
          return existing;
        }
        const recent = await tx.premiumRequest.count({ where: { ownerId, createdAt: { gte: new Date(now.getTime() - 3600000) } } });
        if (recent >= 5) throw new PremiumError("You have started several checkouts recently. Resume an existing checkout or try again in an hour.");
        return tx.premiumRequest.create({ data: { ownerId, requestKey, requirementsHash, requirements: json(requirements), pricingInput: json(pricingInput), catalogueSnapshot: json(catalogue), feeSnapshot: json(fee), mappingVersion: mapping.version, engineVersion: ENGINE_VERSION, createdAt: now, expiresAt: new Date(now.getTime() + 3600000) } });
      });
    }
    const previous = await db.premiumCheckout.findUnique({ where: { requestId: request.id }, include: { payment: true } });
    if (previous?.payment) return { url: `${origin}/premium-estimator/result/${request.id}` };
    if (request.mappingVersion !== mapping.version) throw new PremiumError("Your saved specifications have changed. Review your answers and start a new checkout.");
    if (request.expiresAt.getTime() <= Date.now()) throw new PremiumError("This checkout has expired. Review your answers and start a new checkout.");
    if (previous) {
      const session = await stripe.checkout.sessions.retrieve(previous.sessionId);
      if (session.status === "complete") return { url: `${origin}/premium-estimator/result/${request.id}` };
      if (session.status !== "open") throw new PremiumError("This checkout has expired. Review your answers and start a new checkout.");
      return { url: previous.url };
    }
    if (request.expiresAt.getTime() - Date.now() < 31 * 60000) throw new PremiumError("This checkout has expired. Review your answers and start a new checkout.");
    const session = await stripe.checkout.sessions.create({
      mode: "payment", payment_method_types: ["card"], client_reference_id: request.id,
      metadata: { premiumRequestId: request.id, service: "premium-estimator-v1" },
      line_items: [{ quantity: 1, price_data: { currency: "gbp", unit_amount: 5000, product_data: { name: "Premium construction estimate", description: "Indicative estimate for your reviewed scope; £50 total service fee." } } }],
      customer_email: requirements.contact.email,
      success_url: `${origin}/premium-estimator/result/${request.id}`,
      cancel_url: `${origin}/premium-estimator?cancelled=1`,
      expires_at: Math.floor(request.expiresAt.getTime() / 1000),
    }, { idempotencyKey: `premium-estimator:${request.id}` });
    if (!session.url || session.livemode !== liveMode || new URL(session.url).hostname !== "checkout.stripe.com") throw new Error("Unexpected Stripe Checkout session.");
    try { await db.premiumCheckout.create({ data: { requestId: request.id, sessionId: session.id, url: session.url } }); }
    catch (e) {
      if (!uniqueConflict(e)) throw e;
      const saved = await db.premiumCheckout.findUniqueOrThrow({ where: { requestId: request.id } });
      if (saved.sessionId !== session.id) throw new Error("Checkout identity mismatch.");
    }
    return { url: session.url };
  }

  // Only call this with an event verified by Stripe's signature verifier.
  // A return URL, customer request, or session id alone is never proof of payment.
  async function fulfill(event: Stripe.Event) {
    if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) return;
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.service !== "premium-estimator-v1") return;
    if (session.payment_status !== "paid") return;
    if (event.livemode !== liveMode || session.livemode !== liveMode || session.mode !== "payment" || session.status !== "complete" || session.currency !== "gbp" || session.amount_total !== 5000 || typeof session.payment_intent !== "string") throw new Error("Payment verification mismatch.");
    const stored = await db.premiumCheckout.findUnique({ where: { sessionId: session.id }, include: { request: true } });
    // If Stripe delivered before session persistence completed, return 500 so
    // Stripe retries; never discard an unmatched paid event as successful.
    if (!stored || session.client_reference_id !== stored.requestId || session.metadata.premiumRequestId !== stored.requestId) throw new Error("Payment does not match a stored checkout.");
    let payment = await db.premiumPayment.findUnique({ where: { checkoutId: stored.id } });
    if (!payment) {
      try { payment = await db.premiumPayment.create({ data: { checkoutId: stored.id, eventId: event.id, paymentIntentId: session.payment_intent, amountPence: 5000, currency: "gbp", paidAt: new Date(event.created * 1000) } }); }
      catch (e) { if (!uniqueConflict(e)) throw e; payment = await db.premiumPayment.findUniqueOrThrow({ where: { checkoutId: stored.id } }); }
    }
    if (payment.paymentIntentId !== session.payment_intent) throw new Error("Payment intent mismatch.");
    if (await db.premiumSubmission.findUnique({ where: { paymentId: payment.id } })) return;
    // The paid record above has committed, even if calculation fails. Retries
    // regenerate from the same frozen inputs, never from today's catalogue.
    if (stored.request.engineVersion !== ENGINE_VERSION) throw new Error("This checkout requires its recorded pricing engine version.");
    const result = calculateEstimate(stored.request.pricingInput, stored.request.catalogueSnapshot);
    const reasons = [...result.warnings];
    if (result.assumptions.length) reasons.push(...result.assumptions.map(s => `Assumption: ${s}`));
    try { await db.premiumSubmission.create({ data: { paymentId: payment.id, result: json(result), customerResult: json(customerEstimate(result)), snapshotHash: result.snapshotHash, requiresReview: result.requiresReview || reasons.length > 0, reviewReasons: json(reasons) } }); }
    catch (e) { if (!uniqueConflict(e)) throw e; await db.premiumSubmission.findUniqueOrThrow({ where: { paymentId: payment.id } }); }
  }
  return { checkout, fulfill };
}

import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/app/componets/storefront/site/LegalPage";
import { COMPANY } from "@/app/componets/storefront/site/brand";

export const metadata: Metadata = { title: "Terms & Conditions", description: "Terms for using the 2A Construction website, online estimates and client account.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms and conditions" updated="3 November 2026"
      intro={<>These terms cover your use of this website, our online estimator and your client account. Building work itself is carried out under the written quotation and contract we give you for your project.</>}
      sections={[
        { id: "about", title: "About us", body: <p>This website is run by {COMPANY.legalName}, registered in England and Wales (No. {COMPANY.companyNo}). Contact: <a href={COMPANY.emailHref}>{COMPANY.email}</a>, {COMPANY.phone}.</p> },
        { id: "estimates", title: "Estimates and quotations", body: <ul>
          <li>Prices from the online estimator or given before a site visit are <strong>guides only</strong>. They are not an offer and not a fixed price.</li>
          <li>A formal quotation is issued after a site visit. It sets out the scope, programme, payment stages, exclusions and what you supply. Unless it says otherwise, it is valid for 30 days.</li>
          <li>When you accept a quotation, the contract issued with it governs the work, including variations, payments, cancellation and our {COMPANY.guaranteeYears}-year workmanship guarantee. If anything on this website conflicts with your contract, the contract applies.</li>
        </ul> },
        { id: "consumer", title: "Your consumer rights", body: <p>If you are a consumer, you have rights under the Consumer Rights Act 2015, and for contracts made away from our premises the right to cancel within 14 days under the Consumer Contracts Regulations 2013. Your contract explains how these apply, including what happens if you ask us to start work within the cancellation period. Nothing in these terms affects your statutory rights.</p> },
        { id: "account", title: "Your client account", body: <ul>
          <li>Keep your sign-in details private. Tell us straight away if you think someone else has used your account.</li>
          <li>Messages, choices and payment reports you send through your account are records of the project. Please check product choices carefully before confirming them.</li>
          <li>Marking a payment as made in your account does not confirm it until it reaches our bank account.</li>
        </ul> },
        { id: "content", title: "Website content", body: <p>Photos, drawings, text and designs on this website belong to us or are used with permission. You may view and share links to them, but please don&apos;t copy them for commercial use without asking. Project photos show our work; results on your project will depend on your property and choices.</p> },
        { id: "uploads", title: "Files you upload", body: <p>You confirm you have the right to share any photos, drawings or documents you upload, and you allow us to use them to estimate, design and carry out your project. See our <Link href="/privacy">privacy policy</Link>.</p> },
        { id: "liability", title: "Our responsibility for this website", body: <p>We take care to keep information accurate, but the website is provided for general information. We are not responsible for losses caused by relying on guide prices or general information without a formal quotation. We do not exclude liability where it would be unlawful to do so, including for death or personal injury caused by negligence or for fraud.</p> },
        { id: "law", title: "Law and disputes", body: <p>These terms are governed by the law of England and Wales. Please contact us first if something goes wrong; we are members of the Federation of Master Builders and will try to resolve any concern quickly and fairly.</p> },
      ]} />
  );
}

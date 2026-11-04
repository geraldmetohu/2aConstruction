import type { Metadata } from "next";
import { LegalPage } from "@/app/componets/storefront/site/LegalPage";
import { COMPANY } from "@/app/componets/storefront/site/brand";

export const metadata: Metadata = { title: "Privacy Policy", description: "How 2A Construction Ltd collects, uses and protects your personal data under UK GDPR.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  const e = <a href={COMPANY.emailHref}>{COMPANY.email}</a>;
  return (
    <LegalPage title="Privacy policy" updated="3 November 2026"
      intro={<>This explains what personal information {COMPANY.legalName} collects when you use this website or work with us, why we need it, and your rights. We are the data controller.</>}
      sections={[
        { id: "who", title: "Who we are", body: <p>{COMPANY.legalName}, a company registered in England and Wales (No. {COMPANY.companyNo}). Contact us about privacy at {e} or {COMPANY.phone}.</p> },
        { id: "collect", title: "What we collect", body: <ul>
          <li><strong>Enquiries and estimates:</strong> your name, email, phone, property postcode or address, project details and any photos, drawings or files you upload.</li>
          <li><strong>Client accounts:</strong> your sign-in details (handled by our login provider), your quotes, choices, messages, payments you report, and documents and photos we share with you.</li>
          <li><strong>Running your project:</strong> site address, access notes, contacts you give us, site photos, payment records and the documents for your job.</li>
          <li><strong>Website use:</strong> essential cookies and basic technical logs (for example your IP address and browser) that keep the site secure.</li>
        </ul> },
        { id: "why", title: "Why we use it and our lawful basis", body: <ul>
          <li>To reply to enquiries, visit, measure and quote: <em>steps before entering a contract</em> and our <em>legitimate interests</em> in responding to you.</li>
          <li>To carry out and guarantee the work, take payments and keep you updated: <em>performance of a contract</em>.</li>
          <li>To keep accounting, tax, health and safety and Building Control records: <em>legal obligation</em>.</li>
          <li>Optional analytics cookies: <em>your consent</em>, which you can withdraw at any time in Cookie settings.</li>
        </ul> },
        { id: "share", title: "Who we share it with", body: <>
          <p>We never sell your data. We share only what is needed with:</p>
          <ul>
            <li>service providers who host this website and database, store uploaded files, send our emails and run the client sign-in;</li>
            <li>people working on your project (for example our site team, subcontractors, architects, structural engineers, Building Control and party wall surveyors);</li>
            <li>our accountants, insurers and professional advisers, and authorities where the law requires it.</li>
          </ul>
          <p>Some providers may store data outside the UK. Where they do, we rely on UK adequacy regulations or the UK International Data Transfer Agreement or Addendum.</p>
        </> },
        { id: "keep", title: "How long we keep it", body: <ul>
          <li>Enquiries that don&apos;t go ahead: up to 2 years, then deleted.</li>
          <li>Project records, contracts, invoices and guarantees: 7 years after completion, or longer while a guarantee or claim is open.</li>
          <li>Client accounts: until you ask us to close the account, unless we must keep the records above.</li>
        </ul> },
        { id: "rights", title: "Your rights", body: <>
          <p>You can ask to see, correct, delete or move your data, object to or restrict how we use it, and withdraw consent. Email {e}. We will reply within one month.</p>
          <p>If you are unhappy, you can complain to the Information Commissioner&apos;s Office at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener noreferrer">ico.org.uk</a>.</p>
        </> },
        { id: "security", title: "Security", body: <p>Access to client and project data is limited to our team, protected by sign-in, and sent over encrypted connections. Payment card details are never stored on this website.</p> },
        { id: "changes", title: "Changes to this policy", body: <p>We will update this page if the way we use data changes, and show the date at the top.</p> },
      ]} />
  );
}

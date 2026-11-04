import type { Metadata } from "next";
import { LegalPage } from "@/app/componets/storefront/site/LegalPage";
import { CookieSettingsLink } from "@/app/componets/storefront/site/CookieNotice";

export const metadata: Metadata = { title: "Cookie Policy", description: "Which cookies the 2A Construction website uses and how to change your choices.", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie policy" updated="3 November 2026"
      intro={<>Cookies are small files stored by your browser. We keep them to a minimum. You can change your choice at any time: <CookieSettingsLink className="font-semibold underline" />.</>}
      sections={[
        { id: "essential", title: "Essential cookies (always on)", body: <>
          <p>These are needed for the site to work and can&apos;t be switched off:</p>
          <ul>
            <li><strong>Sign-in cookies</strong> from our login provider, which keep you signed in to your client account and protect it.</li>
            <li><strong>Security and load-balancing cookies</strong> set by our hosting, which keep the site fast and safe.</li>
            <li><strong>Your cookie choice</strong>, stored in your browser so we don&apos;t ask again.</li>
          </ul>
        </> },
        { id: "analytics", title: "Analytics cookies (optional)", body: <p>If you choose &quot;Accept all&quot;, we may use privacy-friendly analytics to count visits and see which pages help people. They are only switched on with your consent and never used for advertising.</p> },
        { id: "advertising", title: "Advertising cookies", body: <p>We don&apos;t use advertising or cross-site tracking cookies.</p> },
        { id: "embedded", title: "Embedded content", body: <p>Some pages show documents or review badges from other websites (for example PDF certificates or review widgets). Those sites may set their own cookies under their own policies.</p> },
        { id: "control", title: "Managing cookies", body: <p>Use <CookieSettingsLink className="font-semibold underline" /> to change your choice, or clear cookies in your browser settings. Blocking essential cookies will stop the client account from working.</p> },
      ]} />
  );
}

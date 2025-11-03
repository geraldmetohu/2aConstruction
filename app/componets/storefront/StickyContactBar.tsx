"use client";

import Link from "next/link";
import { Phone, Mail, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

export function StickyContactBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 280);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-3 inset-x-3 z-50 md:hidden transition ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex w-full rounded-md overflow-hidden shadow-lg">
        <Link href="tel:+447903095967" className="flex-1 bg-primary text-white py-3 text-center font-medium inline-flex items-center justify-center gap-2">
          <Phone className="h-4 w-4" /> Call
        </Link>
        <Link href="mailto:2a.construction.uk@gmail.com" className="flex-1 bg-black text-white py-3 text-center font-medium inline-flex items-center justify-center gap-2">
          <Mail className="h-4 w-4" /> Email
        </Link>
        <Link href="/contact#quote" className="flex-1 bg-white text-black border py-3 text-center font-medium inline-flex items-center justify-center gap-2">
          <MessageSquare className="h-4 w-4" /> Quote
        </Link>
      </div>
    </div>
  );
}

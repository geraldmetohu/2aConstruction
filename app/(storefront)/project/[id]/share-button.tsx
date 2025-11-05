// app/(storefront)/project/[id]/share-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

export function ShareButton({ title }: { title: string }) {
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={() => {
        if (typeof window !== "undefined" && navigator.share) {
          navigator.share({ title, url: window.location.href }).catch(() => {});
        }
      }}
    >
      <Share2 className="mr-2 h-4 w-4" /> Share
    </Button>
  );
}

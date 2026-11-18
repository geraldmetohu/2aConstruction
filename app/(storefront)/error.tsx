"use client";
import { ErrorScreen } from "../componets/ErrorScreen";
export default function StorefrontError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} homeHref="/" />;
}

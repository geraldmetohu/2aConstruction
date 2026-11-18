"use client";
import { ErrorScreen } from "@/app/componets/ErrorScreen";
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen error={error} reset={reset} homeHref="/dashboard" />;
}

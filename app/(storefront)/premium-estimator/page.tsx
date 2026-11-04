import { permanentRedirect } from "next/navigation";

// The paid (£50) premium estimator has been retired. The free online estimator replaces it.
export default function PremiumEstimatorPage() {
  permanentRedirect("/estimator");
}

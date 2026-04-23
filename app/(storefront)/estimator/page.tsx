import type { Metadata } from "next";
import { EstimatorForm } from "./EstimatorForm";

export const metadata: Metadata = {
  title: "Project Estimator",
  description:
    "Share your project details with 2A Construction for an early cost estimate and 3D rendering preparation.",
  alternates: {
    canonical: "/estimator",
  },
};

export default function EstimatorPage() {
  return <EstimatorForm />;
}

import type { Metadata } from "next";
import { EstimatorForm } from "./EstimatorForm";

export const metadata: Metadata = {
  title: "Project Estimator – Extensions, Lofts & Refurbishments in London",
  description:
    "Tell 2A Construction about your extension, loft conversion, refurbishment or roofing project in London or the South East and get an early cost estimate and 3D rendering preparation.",
  alternates: {
    canonical: "/estimator",
  },
};

export default function EstimatorPage() {
  return <EstimatorForm />;
}

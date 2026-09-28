"use client";

type CanvasStageProps = {
  className?: string;
};

export default function CanvasStage({
  className = "",
}: CanvasStageProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
    />
  );
}
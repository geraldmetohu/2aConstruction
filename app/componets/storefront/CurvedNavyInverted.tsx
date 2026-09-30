"use client";

export default function CurvedNavyInverted() {
  return (
    <div
      aria-hidden="true"
      className="relative m-0 block h-[180px] w-full overflow-hidden bg-white p-0 leading-none"
    >
      <svg
        viewBox="0 0 1000 180"
        preserveAspectRatio="none"
        className="absolute inset-0 block h-full w-full"
      >
        <path
          d="
            M 0 0
            C 170 8, 350 35, 540 75
            C 720 113, 875 158, 1000 180
            L 1000 0
            L 0 0
            Z
          "
          fill="#071a33"
        />
      </svg>
    </div>
  );
}
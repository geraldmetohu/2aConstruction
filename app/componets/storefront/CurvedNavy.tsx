"use client";

export default function CurvedNavy() {
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
            M 0 180
            C 170 172, 350 145, 540 105
            C 720 67, 875 22, 1000 0
            L 1000 180
            L 0 180
            Z
          "
          fill="#071a33"
        />
      </svg>
    </div>
  );
}
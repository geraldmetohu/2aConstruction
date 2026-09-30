"use client";

export default function CurvedBlack() {
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
  M 1000 180
  C 830 172, 650 145, 460 105
  C 280 67, 125 22, 0 0
  L 0 180
  L 1000 180
  Z
"
          fill="#111111"
        />
      </svg>
    </div>
  );
}
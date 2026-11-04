import Link from "next/link";
import { FullPhoto } from "./FullPhoto";

/** Three recent projects laid on top of each other like prints; they fan out on hover. Every photo is shown whole. */
export function PhotoFan({ items }: { items: { id: string; name: string; cover: string }[] }) {
  const pos = [
    "left-0 top-10 w-[58%] -rotate-[7deg] group-hover:-translate-x-6 group-hover:-rotate-[10deg]",
    "right-0 top-0 w-[56%] rotate-[6deg] group-hover:translate-x-6 group-hover:rotate-[9deg]",
    "left-1/2 top-24 w-[62%] -translate-x-1/2 rotate-[-1deg] group-hover:-translate-y-3 group-hover:rotate-0",
  ];
  const list = items.slice(0, 3);
  return (
    <div className="group relative mx-auto h-[300px] w-full max-w-xl sm:h-[380px] lg:h-[420px]">
      {list.map((p, i) => (
        <Link key={p.id} href={`/project/${p.id}`} aria-label={p.name}
          className={`absolute bg-white p-2.5 pb-9 shadow-[0_25px_50px_-20px_rgba(0,0,0,.65)] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] hover:z-20 hover:scale-[1.04] ${pos[list.length === 1 ? 2 : i]}`}>
          <FullPhoto src={p.cover} alt={p.name} sizes="(min-width: 1024px) 26vw, 60vw" max={1.6} min={0.8} />
          <span className="absolute inset-x-3 bottom-2 truncate text-[12px] font-semibold text-[#071a33]">{p.name}</span>
        </Link>
      ))}
    </div>
  );
}

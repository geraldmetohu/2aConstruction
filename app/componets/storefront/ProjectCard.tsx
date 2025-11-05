// app/componets/storefront/ProjectCard.tsx
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  description: string;
  images: string[];
}

type Variant = "cover" | "carousel";

interface Props {
  item: Project;
  variant?: Variant; // 'cover' for featured; 'carousel' for portfolio (default: 'carousel')
}

export function ProjectCard({ item, variant = "cover" }: Props) {
  if (variant === "carousel") {
    // your old carousel card (unchanged), kept for portfolio grids
    return (
      <div className="rounded-lg">
        {/* ... keep your Carousel version here if you still want it for portfolio pages ... */}
        {/* If you no longer need the carousel in *any* place, you can delete this branch */}
        <div className="relative h-[330px] overflow-hidden rounded-lg">
          <Image
            src={item.images?.[0] ?? "/placeholder.png"}
            alt={`${item.name} cover`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
        <div className="flex justify-between item-center mt-2">
          <h1 className="font-semibold text-xl">{item.name}</h1>
        </div>
        <p className="text-gray-600 text-sm mt-2 line-clamp-2">{item.description}</p>
        <Button asChild className="w-full mt-5 bg-outline text-primary hover:text-white">
          <Link href={`/project/${item.id}`}>Learn More!</Link>
        </Button>
      </div>
    );
  }

  // ---- COVER variant (for Featured) ----
  const cover = item.images?.[0] ?? "/placeholder.png"; // oldest image as cover
  return (
    <article className="group relative overflow-hidden rounded-2xl border bg-white shadow-sm ring-1 ring-black/5">
      <div className="relative h-56 md:h-64 w-full">
        <Image
          src={cover}
          alt={`${item.name} cover`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold tracking-tight">
          <Link href={`/project/${item.id}`} className="hover:underline">
            {item.name}
          </Link>
        </h3>
        {item.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
        )}
        <div className="mt-3">
          <Button asChild>
            <Link href={`/project/${item.id}`}>View project</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function LoadingProjectCart() {
  return (
    <div className="flex flex-col">
      <div className="w-full h-56 md:h-64 rounded-2xl bg-neutral-200 animate-pulse" />
      <div className="flex flex-col mt-3 gap-y-2">
        <div className="h-4 w-2/3 bg-neutral-200 rounded animate-pulse" />
        <div className="h-4 w-full bg-neutral-200 rounded animate-pulse" />
      </div>
      <div className="h-10 mt-4 w-full bg-neutral-200 rounded-md animate-pulse" />
    </div>
  );
}

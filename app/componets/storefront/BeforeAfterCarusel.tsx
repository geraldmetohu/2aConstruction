"use client";

import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { BeforeAfterPressHold } from "./BeforeAfterPressHolder";

export type BeforeAfterItem = {
  id: string;
  title: string;
  imageStringBefore: string;
  imageStringAfter: string;
};

export function BeforeAfterCarousel({ items }: { items: BeforeAfterItem[] }) {
  if (!items?.length) return null;

  return (
    <section className="w-full">
      <Carousel className="w-full">
        <CarouselContent>
          {items.map((it) => (
            <CarouselItem key={it.id} className="p-0">
                <BeforeAfterPressHold
                beforeSrc={it.imageStringBefore}
                afterSrc={it.imageStringAfter}
                title={it.title}
                />
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4 pointer-events-none">
          <div className="pointer-events-auto">
            <CarouselPrevious className="bg-black/60 text-white hover:bg-black/80 border-0" />
          </div>
          <div className="pointer-events-auto">
            <CarouselNext className="bg-black/60 text-white hover:bg-black/80 border-0" />
          </div>
        </div>
      </Carousel>
    </section>
  );
}

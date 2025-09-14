import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";

interface iAppProps {
    item: {
        name: string;
        id: string;
        description: string;
        images: string[];
    };
}
export function ProjectCard({item}: iAppProps) {
    return(
        <div className="rounded-lg">
            <Carousel className="w-full mx-auto">
                <CarouselContent>
                    {item.images.map((item,index) => (
                        <CarouselItem key={index}>
                            <div className="relative h-[330px]">
                                <Image src={item} alt="Project Image" fill className="object-cover object-center w-full h-full rounded-lg" />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="ml-16"/>
                <CarouselNext className="mr-16"/>
            </Carousel>
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

export function LoadingProjectCart() {
    return (
        <div className="flex flex-col">
            <Skeleton className="w-full h-[330px]"/>
            <div className="flex flex-col mt-2 gap-y-2">
                <Skeleton className="h-4 w-full"/>
                <Skeleton className="h-6 w-full"/>
            </div>
            <Skeleton className="h-10 mt-5 w-full"/>
        </div>
    )
}
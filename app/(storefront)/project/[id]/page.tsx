import { FeaturedProject } from "@/app/componets/storefront/FeaturedProject";
import { ImageSlider } from "@/app/componets/storefront/ImageSlider";
import { prisma } from "@/app/lib/db";
import { Button } from "@/components/ui/button";
import { StarIcon } from "lucide-react";
import { notFound } from "next/navigation";

async function getData(projectId: string) {
    const data = await prisma.project.findUnique({
        where: {
            id: projectId,
        },
        select: {
            images: true,
            description: true,
            name: true,
            id: true,
        }
    });
    if(!data){
        return notFound();
    }
    return data;
}

export default async function ProjectIdRoute ({params,}: {params: {id: string};}){
    const data = await getData(params.id);
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start lg:gap-x24 py-6">
                <ImageSlider images={data.images} />
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{data.name}</h1>
                <div className="mt-3 flex items-center gap-1">
                    <StarIcon className="h-4 w-4 text-yellow-300 fill-yellow-300"/>
                    <StarIcon className="h-4 w-4 text-yellow-300 fill-yellow-300"/>
                    <StarIcon className="h-4 w-4 text-yellow-300 fill-yellow-300"/>
                    <StarIcon className="h-4 w-4 text-yellow-300 fill-yellow-300"/>
                    <StarIcon className="h-4 w-4 text-yellow-300 fill-yellow-300"/>
                </div>
                <p className="text-base text-gray-700 mt-6">{data.description}</p>

                </div>
            </div>


            <div className="mt-16">
                <FeaturedProject />
            </div>
        </>
    );
}
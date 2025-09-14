import { prisma } from "@/app/lib/db";
import { LoadingProjectCart, ProjectCard } from "./ProjectCard";
import { Suspense } from "react";

async function getData() {
    const data = await prisma.project.findMany({
        where: {
            status: "published",
            isFeatured: true,
        },
        select: {
            id: true,
            name: true,
            description: true,
            images: true,
        },
        orderBy: {
            createdAt: "desc"
        },
        take: 3,
        
    });
    return data;
    
}
export  function FeaturedProject (){
    return (
        <>
            <h2 className="text-2xl font-extrabold tracking-tight">Featured Projects</h2>
            <Suspense fallback={<LoadinGRows />} >
                <LoadFeaturedProject />
            </Suspense>
        </>
    );
}

async function LoadFeaturedProject() {
    const data = await getData();
    return (
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.map((item) => (
                    
                    <ProjectCard key={item.id} item={item}/>
                ))}
            </div>
    )
}

function LoadinGRows() {
    return(
        <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <LoadingProjectCart />
            <LoadingProjectCart />
            <LoadingProjectCart />
        </div>
    );
}
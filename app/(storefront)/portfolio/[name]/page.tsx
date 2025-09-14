import { ProjectCard } from "@/app/componets/storefront/ProjectCard";
import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";
import { title } from "process";

async function getData(projectCategory : string) {
    switch(projectCategory){
        case "all": {
            const data = await prisma.project.findMany({
                select: {
                    name: true,
                    images: true,
                    id: true,
                    description: true,
                },
                where: {
                    status: "published"
                }
            });
            return {
                title: "All Projects",
                data: data,
            }
        }
        case "refurbishment": {
            const data = await prisma.project.findMany({
                where: {
                    status: "published",
                    category: "refurbishment"
                },
                select: {
                    name: true,
                    images: true,
                    id: true,
                    description: true,
                }

            });
            return {
                title: "Refurbishment Projects",
                data: data,
            }
        }
        case "loft": {
            const data = await prisma.project.findMany({
                where: {
                    status: "published",
                    category: "loft"
                },
                select: {
                    name: true,
                    images: true,
                    id: true,
                    description: true,
                }

            });
            return {
                title: "Loft Projects",
                data: data,
            }
        }        
        case "extention": {
            const data = await prisma.project.findMany({
                where: {
                    status: "published",
                    category: "extention"
                },
                select: {
                    name: true,
                    images: true,
                    id: true,
                    description: true,
                }

            });
            return {
                title: "Extention Projects",
                data: data,
            }
        }        
        case "roof": {
            const data = await prisma.project.findMany({
                where: {
                    status: "published",
                    category: "roof"
                },
                select: {
                    name: true,
                    images: true,
                    id: true,
                    description: true,
                }

            });
            return {
                title: "Roofing Projects",
                data: data,
            }
        }
        default: {
            return notFound();
        }
    }
}


export default async function CategoriesPage({params,}: {params: {name: string};}) {

    const {data, title} = await getData(params.name);
    return (
        <section>
            <h1 className="font-semibold text-3xl my-5">{title}</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.map((item) => (
                    <ProjectCard key={item.id} item={item} />
                ))}
            </div>
        </section>
    );
}
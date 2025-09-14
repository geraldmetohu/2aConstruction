import { LoadingProjectCart } from "@/app/componets/storefront/ProjectCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingFile() {
    
    return (
        <div>
            <Skeleton className="h-10 w-65 my-5"/>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
                <LoadingProjectCart />
            </div>
        </div>
    )
}
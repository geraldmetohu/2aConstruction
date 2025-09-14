import Image from "next/image";
import Link from "next/link";
import roof from "@/public/roof.jpg";
import extention from "@/public/extention.jpeg";
import all from "@/public/general.jpg";
import general from "@/public/general.jpg"
import loft from "@/public/loft.jpg"
import refurbishment from "@/public/refurbishment.jpg"


export function CategorySelection() {
    return(
        <div className="py-24 sm:py-32 ">
            <div className="flex justify-between items-enter">
                <h2 className="text-2xl font-extrabold tracking-tight">
                    Browse by Category
                </h2>
                <Link className="text-sm font-semibold text-primary hover:text-primary/70" href="/portfolio/all"> 
                    Browse all Projects &rarr;
                </Link>
            </div>
            
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-4 lg:gap-6 ">
                <div className="group aspect-w-2 aspect-h-1 rounded-xl overflow-hidden sm:aspect-w-1 sm:row-span-2">
                    <Image src={all} alt="All Projects Image" className="object-cover object-center"/>
                    <div className="bg-gradient-to-b from-transparent to-black opacity-50" />
                    <div className="p-6 flex items-end">
                        <Link href="/portfolio/all">
                            <h3 className="text-white font-semibold">All Projects</h3>
                            <p className="mt-1 text-sm text-white">Explore</p>
                        </Link>
                    </div>
                </div>
            
                <div className="group aspect-w-2 aspect-h-1 rounded-lg overflow-hidden sm:relative sm:h-full sm:aspect-none">
                    <Image src={general} alt="General Projects Image" className="object-bottom object-cover sm:absolute sm:inset-0 sm:w-full sm:h-full"/>
                    <div className="bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0" />
                    <div className="p-6 flex items-end sm:absolute sm:inset-0">
                        <Link href="/portfolio/general">
                            <h3 className="text-white font-semibold">General Projects</h3>
                            <p className="mt-1 text-sm text-white">Explore</p>
                        </Link>
                    </div>
                </div>

                <div className="group aspect-w-2 aspect-h-1 rounded-lg overflow-hidden sm:relative sm:h-full sm:aspect-none">
                    <Image src={refurbishment} alt="Refurbishment Projects Image" className="object-center object-cover sm:absolute sm:inset-0 sm:w-full sm:h-full"/>
                    <div className="bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0" />
                    <div className="p-6 flex items-end sm:absolute sm:inset-0">
                        <Link href="/portfolio/refurbishment">
                            <h3 className="text-white font-semibold">Refurbishment Projects</h3>
                            <p className="mt-1 text-sm text-white">Explore</p>
                        </Link>
                    </div>
                </div>

                                <div className="group aspect-w-2 aspect-h-1 rounded-lg overflow-hidden sm:relative sm:h-full sm:aspect-none">
                    <Image src={loft} alt="Loft Projects Image" className="object-bottom object-cover sm:absolute sm:inset-0 sm:w-full sm:h-full"/>
                    <div className="bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0" />
                    <div className="p-6 flex items-end sm:absolute sm:inset-0">
                        <Link href="/portfolio/loft">
                            <h3 className="text-white font-semibold">Loft Projects</h3>
                            <p className="mt-1 text-sm text-white">Explore</p>
                        </Link>
                    </div>
                </div>

                                <div className="group aspect-w-2 aspect-h-1 rounded-lg overflow-hidden sm:relative sm:h-full sm:aspect-none">
                    <Image src={extention} alt="Extention Projects Image" className="object-bottom object-cover sm:absolute sm:inset-0 sm:w-full sm:h-full"/>
                    <div className="bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0" />
                    <div className="p-6 flex items-end sm:absolute sm:inset-0">
                        <Link href="/portfolio/extention">
                            <h3 className="text-white font-semibold">Extention Projects</h3>
                            <p className="mt-1 text-sm text-white">Explore</p>
                        </Link>
                    </div>
                </div>

                                <div className="group aspect-w-2 aspect-h-1 rounded-lg overflow-hidden sm:relative sm:h-full sm:aspect-none">
                    <Image src={roof} alt="Roofing Projects Image" className="object-bottom object-cover sm:absolute sm:inset-0 sm:w-full sm:h-full"/>
                    <div className="bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0" />
                    <div className="p-6 flex items-end sm:absolute sm:inset-0">
                        <Link href="/portfolio/roof">
                            <h3 className="text-white font-semibold">Roofing Projects</h3>
                            <p className="mt-1 text-sm text-white">Explore</p>
                        </Link>
                    </div>
                </div>           
            </div>
        </div>
    );
}
import { DeleteBanner } from "@/app/actions";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function DeleteBannerRoute({params}: {params: {id: string};}) {

    return (

        <div className="h-[88vh w-full flex items-center justify-center">
            <Card className="max-w-xl">
                <CardHeader>
                    <CardTitle>Are you sure you want to delete this banner</CardTitle>
                    <CardDescription>
                        This action can not be undone. This will permenently delete this banner and remove all data from our servers.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="w-full flex justify-between">
                    <Button variant="secondary" asChild>
                        <Link href="/dashboard/banner">Cancel</Link>
                    </Button>
                    <form action={DeleteBanner} >
                        <input type="hidden" name="bannerId" value={params.id}/>
                        <SubmitButton variant="destructive" text="Delete Product"/>
                    </form>
                </CardFooter>
            </Card>
        </div>

    );
}
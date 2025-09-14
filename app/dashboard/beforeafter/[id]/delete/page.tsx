import { DeleteBeforeAfter } from "@/app/actions";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function DeleteBeforeAfterRoute({params}: {params: {id: string};}) {

    return (

        <div className="h-[88vh w-full flex items-center justify-center">
            <Card className="max-w-xl">
                <CardHeader>
                    <CardTitle>Are you sure you want to delete this B/A</CardTitle>
                    <CardDescription>
                        This action can not be undone. This will permenently delete this B/A and remove all data from our servers.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="w-full flex justify-between">
                    <Button variant="secondary" asChild>
                        <Link href="/dashboard/beforeafter">Cancel</Link>
                    </Button>
                    <form action={DeleteBeforeAfter} >
                        <input type="hidden" name="beforeafterId" value={params.id}/>
                        <SubmitButton variant="destructive" text="Delete B/A"/>
                    </form>
                </CardFooter>
            </Card>
        </div>

    );
}
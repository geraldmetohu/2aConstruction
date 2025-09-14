import { DeleteProject } from "@/app/actions";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function DeleteRoute({params}: {params: {id: string}}) {
    return(
        <div className="h-[88vh w-full flex items-center justify-center">
            <Card className="max-w-xl">
                <CardHeader>
                    <CardTitle>Are you sure you want to delete this project</CardTitle>
                    <CardDescription>
                        This action can not be undone. This will permenently delete this project and remove all data from our servers.
                    </CardDescription>
                </CardHeader>
                <CardFooter className="w-full flex justify-between">
                    <Button variant="secondary" asChild>
                        <Link href="/dashboard/projects">Cancel</Link>
                    </Button>
                    <form action={DeleteProject} >
                        <input type="hidden" name="projectId" value={params.id}/>
                        <SubmitButton variant="destructive" text="Delete Project"/>
                    </form>
                </CardFooter>
            </Card>
        </div>
    )
}
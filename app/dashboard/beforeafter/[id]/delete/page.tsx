import Link from "next/link";
import { DeleteBeforeAfter } from "@/app/actions";
import { SubmitButton } from "@/app/componets/SubmitButtons";
import { Button } from "@/components/ui/button";
import {
  Card, CardHeader, CardTitle, CardDescription, CardFooter
} from "@/components/ui/card";

export default function DeleteBeforeAfterRoute({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-[88vh] w-full items-center justify-center">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Delete Before/After?</CardTitle>
          <CardDescription>This action cannot be undone.</CardDescription>
        </CardHeader>

        <CardFooter className="flex justify-between w-full">
          <Button variant="secondary" asChild>
            <Link href="/dashboard/beforeafter">Cancel</Link>
          </Button>

          <form action={DeleteBeforeAfter}>
            <input type="hidden" name="beforeafterId" value={params.id} />
            <SubmitButton variant="destructive" text="Delete" />
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

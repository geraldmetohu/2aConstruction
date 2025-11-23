import Link from "next/link";
import { DeleteBanner } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card, CardHeader, CardTitle, CardDescription, CardFooter
} from "@/components/ui/card";
import { SubmitButton } from "@/app/componets/SubmitButtons";

export default function DeleteBannerRoute({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-[88vh] w-full items-center justify-center">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Delete this banner?</CardTitle>
          <CardDescription>This action cannot be undone.</CardDescription>
        </CardHeader>

        <CardFooter className="flex justify-between w-full">
          <Button variant="secondary" asChild>
            <Link href="/dashboard/banner">Cancel</Link>
          </Button>

          <form action={DeleteBanner}>
            <input type="hidden" name="bannerId" value={params.id} />
            <SubmitButton variant="destructive" text="Delete Banner" />
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}

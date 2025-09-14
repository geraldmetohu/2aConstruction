// app/dashboard/hero-videos/[id]/delete/page.tsx  (SERVER COMPONENT)
import Link from "next/link";
import { DeleteHeroVideo } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeleteHeroVideoRoute({ params }: { params: { id: string } }) {
  return (
    <div className="flex h-[88vh] w-full items-center justify-center">
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Delete this hero video?</CardTitle>
          <CardDescription>This action cannot be undone.</CardDescription>
        </CardHeader>
        <CardFooter className="flex w-full justify-between">
          <Button variant="secondary" asChild>
            <Link href="/dashboard/hero-videos">Cancel</Link>
          </Button>
          <form action={DeleteHeroVideo}>
            <input type="hidden" name="id" value={params.id} />
            <Button variant="destructive" type="submit">Delete</Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
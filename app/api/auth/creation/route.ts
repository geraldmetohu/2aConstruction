import { prisma } from "@/app/lib/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { getUser} = getKindeServerSession();
    const user = await getUser()
    
    if(!user || user === null || !user.id) {
        throw new Error("Something went wrong...");
    }

    let dbUser = await prisma.user.findUnique({
        where:{
            id: user.id
        },
        include: {
            clients: true,
        },
    });
    
    if(!dbUser) {
        const normalizedEmail = user.email?.toLowerCase() ?? "";
        const existingByEmail = normalizedEmail
          ? await prisma.user.findFirst({
              where: {
                email: normalizedEmail,
              },
              include: {
                clients: true,
              },
            })
          : null;

        if (existingByEmail) {
          dbUser = await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
              data: {
                id: user.id,
                firstName: user.given_name ?? existingByEmail.firstName ?? "",
                lastName: user.family_name ?? existingByEmail.lastName ?? "",
                email: normalizedEmail,
                profileImage: user.picture ?? existingByEmail.profileImage ?? `https://avatar.vercel.sh/${user.given_name}`,
              },
            });

            await tx.client.updateMany({
              where: {
                userId: existingByEmail.id,
              },
              data: {
                userId: createdUser.id,
              },
            });

            await tx.user.delete({
              where: {
                id: existingByEmail.id,
              },
            });

            return tx.user.findUniqueOrThrow({
              where: {
                id: createdUser.id,
              },
              include: {
                clients: true,
              },
            });
          });
        } else {
          dbUser = await prisma.user.create({
              data: {
                  id: user.id,
                  firstName: user.given_name ?? "",
                  lastName: user.family_name ?? "",
                  email: normalizedEmail,
                  profileImage: user.picture ?? `https://avatar.vercel.sh/${user.given_name}`,
              },
              include: {
                clients: true,
              },
          });
        }
    }
    const admins = process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];
    const isAdmin = !!user.email && admins.includes(user.email.toLowerCase());
    const hasClientPortal = (dbUser.clients?.length ?? 0) > 0;
    const redirectPath = isAdmin ? "/dashboard" : hasClientPortal ? "/client-dashboard" : "/";

    return NextResponse.redirect(new URL(redirectPath, request.url));
}

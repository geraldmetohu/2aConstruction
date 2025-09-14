import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {RegisterLink, LoginLink} from "@kinde-oss/kinde-auth-nextjs/components";
import { DollarSign, PartyPopper, ShoppingBag, User2 } from "lucide-react";
import { prisma } from "../lib/db";
//import { DashboardStats } from "../componets/dashboard/DashboardStats";
//import { RecentSales } from "../componets/dashboard/RecentSales";
//import { Chart } from "../componets/dashboard/Chart";


export default async function Dashboard() {
    return(
        <>
        {/*<DashboardStats/>*/}
        <div className="grid gap-4 md:gp-8 lg:grid-cols-2 xl:grid-cols-3 mt-10">
            <Card className="xl:col-span-2">
                <CardHeader>
                    <CardTitle>2A Construction Dashboard</CardTitle>
                    <CardDescription>Navigate to add images photos and projects</CardDescription>
                </CardHeader>
                <CardContent>
                  {/*  <Chart data={data}/> */}
                </CardContent>
            </Card>
           {/* <RecentSales />*/}
        </div>
        </>

    )
}
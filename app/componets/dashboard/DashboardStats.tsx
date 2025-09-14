/*import { prisma } from "@/app/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, PartyPopper, PoundSterling, ShoppingBag, User2 } from "lucide-react";

async function getData() {
    const [user, products, orders] = await Promise.all([
        prisma.user.findMany( {
            select: {
                id: true,
            },
        }),
        prisma.product.findMany( {
            select: {
                id: true,
            }
        }),
        prisma.order.findMany( {
            select: {
                amount: true,
            }
        }),
    ]);
    return {user, products, orders};
    
}
export async function DashboardStats() {
    const {user, products, orders} = await getData();

    const totalAmount = orders.reduce((accumalator, currentValue) => {
        return accumalator + currentValue.amount;
    }, 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row justify-between items-center p2">
                <CardTitle>Total Revenue</CardTitle>
                <PoundSterling className="h-4 w-4 text-green-500"/>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">£{new Intl.NumberFormat("en-US").format(totalAmount / 100)}</p>
                <p className="text-xs text-muted-foreground">Based on 100 Sales</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row justify-between items-center p2">
                <CardTitle>Total Sales</CardTitle>
                <ShoppingBag className="h-4 w-4 text-blue-500"/>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{orders.length}</p>
                <p className="text-xs text-muted-foreground">Total Sales on the Company</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row justify-between items-center p2">
                <CardTitle>Total Products</CardTitle>
                <PartyPopper className="h-4 w-4 text-indigo-500"/>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-xs text-muted-foreground">Total Products Created</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row justify-between items-center p2">
                <CardTitle>Total Users</CardTitle>
                <User2 className="h-4 w-4 text-orange-500"/>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{user.length}</p>
                <p className="text-xs text-muted-foreground">Total Users Signed up</p>
            </CardContent>
        </Card>
    </div>
    )
}*/
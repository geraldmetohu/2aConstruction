/*"use client";
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line} from 'recharts';

const aggregateData = (data: any) => {
    const aggregated = data.reduce((acc: any, curr: any) => {
      if (acc[curr.date]) {
        acc[curr.date] += curr.revenue;
      } else {
        acc[curr.date] = curr.revenue;
      }
      return acc;
    }, {});
  
    return Object.keys(aggregated).map((date) => ({
      date,
      revenue: aggregated[date],
    }));
  };

interface iAppProps {
    data: {
        date: string;
        revenue: number;
    }[];
}
export function Chart({ data }: iAppProps) {
    const proccessedData = aggregateData(data);
    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart data={proccessedData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" stroke='#3b82f6' activeDot={{r: 8}} dataKey="revenue" />
            </LineChart>
        </ResponsiveContainer>
    )
}*/
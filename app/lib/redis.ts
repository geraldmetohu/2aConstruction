import { Redis } from "@upstash/redis";



export const redis = new Redis({
    url: 'https://pleasant-horse-10984.upstash.io',
    token: 'ASroAAIjcDEzZDkwODg4ZGE1YTU0NjRhYTJjZDViYTQwNDdkMDNjZHAxMA',
    //token: process.env.REDIS_TOKEN,
});
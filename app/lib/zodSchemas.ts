import {z} from "zod"

export const ProjectSchema = z.object({
    name: z.string(),
    description: z.string(),
    status: z.enum(["draft", "published", "archived"]),
    images: z.array(z.string()).min(1, "At least one image is required"),
    category: z.enum(["general", "refurbishment", "extention", "roof", "loft","painting","flooring","plumbing", "electrical"]),
    isFeatured: z.boolean().optional(),
});

export const ContactSchema = z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    role: z.enum(["client", "painter", "groundwork", "scaffolding", "roofer", "carpetner", "plaster","plasterboard" ,"electric","plumbing" ,"gas" ,"bricklayer" ,"labour" ,"materials" ,"skip" ,"architect" ,"other"]),
    description: z.string(),
    address: z.string(),
    price: z.string(),
});


export const bannerSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z
    .string()
    .optional()
    .transform(v => v === "" ? undefined : v),
  ctahref: z
    .string()
    .optional()
    .transform(v => v === "" ? undefined : v),
  ctatext: z
    .string()
    .optional()
    .transform(v => v === "" ? undefined : v),
  imageString: z.string().min(1, "Image is required"),
});


export const beforeafterSchema = z.object({
    title: z.string(),
    imageStringBefore: z.string(),
    imageStringAfter: z.string(),
});

export const heroVideoSchema = z.object({
  title: z.string().min(2),
  subtitle: z.string().optional(),
  ctaText: z.string().optional(),
  ctaHref: z.string().url().optional(),
  videoUrl: z.string().url().min(1),
  posterUrl: z.string().url().optional(),
});
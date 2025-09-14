"use server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import {parseWithZod} from "@conform-to/zod"
import { bannerSchema, beforeafterSchema, ProjectSchema, ContactSchema, heroVideoSchema } from "./lib/zodSchemas";
import { prisma } from "./lib/db";
import nodemailer from "nodemailer";

export async function CreateProject(prevState: unknown,formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }

    const submission = parseWithZod(formData, {
        schema: ProjectSchema,
    });

    if(submission.status !== "success") {
        return submission.reply();
    }
    const flattenUrls = submission.value.images.flatMap((urlString) => urlString.split(",").map((url) => url.trim()));

    await prisma.project.create({
        data: {
            name: submission.value.name,
            description: submission.value.description,
            status: submission.value.status,
            images: flattenUrls,
            category: submission.value.category,
            isFeatured: submission.value.isFeatured === true ? true: false,
        },
    });

    redirect("/dashboard/projects");
}

export async function EditProject(prevState: any,formData: FormData ) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (!user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }
    const submission = parseWithZod(formData, {
        schema: ProjectSchema,
    });

    if(submission.status !=="success") {
        return submission.reply();
    }

    const flattenUrls = submission.value.images.flatMap((urlString) => urlString.split(",").map((url) => url.trim()));

    const projectId = formData.get("projectId") as string;
    await prisma.project.update({
        where: {
            id: projectId
        },
        data: {
            name: submission.value.name,
            description: submission.value.description,
            category: submission.value.category,
            status: submission.value.status,
            isFeatured: submission.value.isFeatured === true ? true: false,
            images: flattenUrls,
        }
    });

    redirect("/dashboard/projects");

}

export async function DeleteProject(formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }
        // ✅ Get the productId safely
    const projectId = formData.get("projectId") as string;

    // ✅ Add a check to prevent null errors
    if (!projectId) {
        throw new Error("Project ID is missing");
    }

    await prisma.project.delete({
        where: {
            id: projectId,
        },
    });

    redirect("/dashboard/projects");
    
}



export async function CreateBeforeAfter(prevState: any, formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }

    const submission = parseWithZod(formData, {
        schema: beforeafterSchema,
    });

    if(submission.status !== "success") {
        return submission.reply();
    }

    await prisma.beforeAfter.create({
        data: {
            title: submission.value.title,
            imageStringBefore: submission.value.imageStringBefore,
            imageStringAfter: submission.value.imageStringAfter
        },
    });

    redirect("/dashboard/beforeafter");

}

export async function DeleteBeforeAfter (formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }

    await prisma.beforeAfter.delete({
        where: {
            id: formData.get("beforeafterId") as string,
        },
    });
    redirect("/dashboard/beforeafter");
}



export async function CreateContact(prevState: unknown,formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }

    const submission = parseWithZod(formData, {
        schema: ContactSchema,
    });

    if(submission.status !== "success") {
        return submission.reply();
    }

    await prisma.contact.create({
        data: {
            name: submission.value.name,
            email: submission.value.email,
            phone: submission.value.phone,
            role: submission.value.role,
            description: submission.value.description,
            address: submission.value.address,
            price: submission.value.price,
        },
    });

    redirect("/dashboard/contacts");
}

export async function EditContact(prevState: any,formData: FormData ) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }
    const submission = parseWithZod(formData, {
        schema: ContactSchema,
    });

    if(submission.status !=="success") {
        return submission.reply();
    }


    const contactId = formData.get("contactId") as string;
    await prisma.contact.update({
        where: {
            id: contactId
        },
        data: {
            name: submission.value.name,
            email: submission.value.email,
            phone: submission.value.phone,
            role: submission.value.role,
            description: submission.value.description,
            address: submission.value.address,
            price: submission.value.price,
        },
    });

    redirect("/dashboard/contacts");

}

export async function DeleteContact(formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }
        // ✅ Get the productId safely
    const contactId = formData.get("ContactId") as string;

    // ✅ Add a check to prevent null errors
    if (!contactId) {
        throw new Error("Contact ID is missing");
    }

    await prisma.contact.delete({
        where: {
            id: contactId,
        },
    });

    redirect("/dashboard/contacts");
    
}



export async function CreateBanner(prevState: any, formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }

    const submission = parseWithZod(formData, {
        schema: bannerSchema,
    });

    if(submission.status !== "success") {
        return submission.reply();
    }

    await prisma.banner.create({
        data: {
            title: submission.value.title,
            subtitle: submission.value.subtitle,
            ctaHref: submission.value.ctahref,
            ctaText: submission.value.ctatext,
            imageString: submission.value.imageString
        },
    });

    redirect("/dashboard/banner");

}

export async function DeleteBanner (formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if ( !user || (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com")){
        return redirect("/");
    }

    await prisma.banner.delete({
        where: {
            id: formData.get("bannerId") as string,
        },
    });
    redirect("/dashboard/banner");
}
    




export async function sendContact(prevState: any, formData: FormData) {
  // Grab fields
  const name = (formData.get("name") as string || "").trim();
  const email = (formData.get("email") as string || "").trim();
  const phone = (formData.get("phone") as string || "").trim();
  const message = (formData.get("message") as string || "").trim();
  const honey = (formData.get("company") as string || "").trim(); // honeypot

  // Basic validation (no schema)
  if (honey) return { ok: true, message: "Thanks!" }; // bot; silently "succeed"
  if (!name || !email || !message) {
    return { ok: false, message: "Please fill in your name, email, and message." };
  }

  // Build email contents
  const text = [
    `New website enquiry`,
    ``,
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    ``,
    `Message:`,
    message,
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;">
      <h2>New website enquiry</h2>
      <table cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
        <tr><td><b>Name</b></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><b>Email</b></td><td>${escapeHtml(email)}</td></tr>
        ${phone ? `<tr><td><b>Phone</b></td><td>${escapeHtml(phone)}</td></tr>` : ""}
      </table>
      <h3 style="margin-top:16px">Message</h3>
      <p>${nl2br(escapeHtml(message))}</p>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: String(process.env.SMTP_SECURE ?? "true") === "true",
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    });

    await transporter.sendMail({
      from: process.env.CONTACT_FROM ?? process.env.SMTP_USER!,
      to: process.env.CONTACT_TO!,
      subject: `New enquiry from ${name}`,
      replyTo: email,
      text,
      html,
    });

    return { ok: true, message: "Sent! We’ll get back to you shortly." };
  } catch (err) {
    console.error("Email failed:", err);
    return { ok: false, message: "Sorry, failed to send. Please email us directly." };
  }
}

/* helpers */
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
}
function nl2br(s: string) {
  return s.replace(/\n/g, "<br/>");
}


export async function CreateHeroVideo(_: any, formData: FormData) {
  const data = Object.fromEntries(formData) as Record<string, string>;
  const parsed = heroVideoSchema.safeParse(data);
  if (!parsed.success) {
    return { status: "error", errors: parsed.error.flatten().fieldErrors } as const;
  }

  await prisma.heroVideo.create({ data: parsed.data });
  redirect("/dashboard/hero-videos");
}

export async function DeleteHeroVideo(formData: FormData) {
  const id = String(formData.get("id"));
  if (!id) return;
  await prisma.heroVideo.delete({ where: { id } });
  redirect("/dashboard/hero-videos");
}
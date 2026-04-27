"use server";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import {parseWithZod} from "@conform-to/zod"
import { bannerSchema, beforeafterSchema, ProjectSchema, ContactSchema, heroVideoSchema } from "./lib/zodSchemas";
import { prisma } from "./lib/db";
import nodemailer from "nodemailer";
import { headers } from "next/headers";
import { deleteFile } from "./api/uploadthing/core";
import { randomUUID } from "crypto";
import { ClientPhaseStatus, ClientPortalStage } from "@prisma/client";

type ClientPhaseInput = {
  id?: string;
  title: string;
  status: ClientPhaseStatus;
  phaseOrder: number;
  targetDays?: number | null;
  targetDate?: string | null;
  jobs: string[];
  notes?: string;
  images: string[];
};

export async function CreateProject(prevState: unknown,formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
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
            sourceClientProjectId: submission.value.sourceClientProjectId || null,
            isFeatured: submission.value.isFeatured === true ? true: false,
        },
    });

    redirect("/dashboard/projects");
}

export async function EditProject(prevState: any,formData: FormData ) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (!user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
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
            sourceClientProjectId: submission.value.sourceClientProjectId || null,
        }
    });

    redirect("/dashboard/projects");

}

export async function DeleteProject(formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
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

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
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

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
        return redirect("/");
    }

const id = formData.get("beforeafterId") as string;

  const entry = await prisma.beforeAfter.findUnique({
    where: { id },
  });

  if (!entry) return;

  // delete both images
  if (entry.imageStringBefore) {
    await deleteFile(entry.imageStringBefore);
  }

  if (entry.imageStringAfter) {
    await deleteFile(entry.imageStringAfter);
  }

  // delete DB
  await prisma.beforeAfter.delete({
    where: { id },
  });
    redirect("/dashboard/beforeafter");
}



export async function CreateContact(prevState: unknown,formData: FormData) {
    const { getUser} = getKindeServerSession();
    const user = await getUser();

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
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

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
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

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
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

    if (  !user ||  (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
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

    if ( !user || (user.email !== "geraldmetohu@gmail.com" && user.email !== "hasanajaleksios@icloud.com" && user.email !== "ensisako11@gmail.com")){
        return redirect("/");
    }

  const id = formData.get("bannerId") as string;

  const banner = await prisma.banner.findUnique({
    where: { id },
  });

  if (!banner) return;

  // Delete UploadThing file
  if (banner.imageString) {
    await deleteFile(banner.imageString);
  }

  // Delete database entry
  await prisma.banner.delete({
    where: { id },
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

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? sanitizeText(value) : "";
}

function formDataToSnapshot(formData: FormData) {
  const snapshot: Record<string, string | string[]> = {};
  const allowedUploadHosts = getAllowedUploadHosts();

  for (const key of Array.from(new Set(formData.keys()))) {
    if (key === "company") continue;

    const values = formData.getAll(key)
      .map((value) => {
        if (typeof value === "string") return sanitizeSnapshotValue(key, value, allowedUploadHosts);
        return value.name ? `[file] ${value.name}` : "[file]";
      })
      .filter(Boolean);

    snapshot[key] = values.length > 1 ? values : values[0] ?? "";
  }

  return snapshot;
}

function sanitizeText(value: string, maxLength = 2000) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeSnapshotValue(key: string, value: string, allowedUploadHosts: Set<string>) {
  const trimmed = sanitizeText(value, 4000);

  if (!trimmed) return "";

  if (key.endsWith("Urls") || /^https?:\/\//i.test(trimmed)) {
    return isAllowedUploadUrl(trimmed, allowedUploadHosts) ? trimmed : "";
  }

  return trimmed;
}

function normalizeEmail(value: string) {
  return sanitizeText(value, 320).toLowerCase();
}

function parsePhaseInputs(raw: string) {
  try {
    const parsed = JSON.parse(raw) as ClientPhaseInput[];

    return parsed
      .map((phase, index) => ({
        id: phase.id,
        title: sanitizeText(phase.title, 160),
        status: (Object.values(ClientPhaseStatus).includes(phase.status) ? phase.status : "planned") as ClientPhaseStatus,
        phaseOrder: Number.isFinite(phase.phaseOrder) ? phase.phaseOrder : index,
        targetDays: typeof phase.targetDays === "number" ? phase.targetDays : null,
        targetDate: phase.targetDate ? new Date(phase.targetDate) : null,
        jobs: Array.isArray(phase.jobs) ? phase.jobs.map((job) => sanitizeText(job, 120)).filter(Boolean) : [],
        notes: phase.notes ? sanitizeText(phase.notes, 4000) : "",
        images: Array.isArray(phase.images) ? phase.images.filter((image) => isAllowedUploadUrl(image, getAllowedUploadHosts())) : [],
      }))
      .filter((phase) => phase.title);
  } catch {
    return [];
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getAllowedUploadHosts() {
  const allowedHosts = new Set<string>(["utfs.io"]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (siteUrl) {
    try {
      allowedHosts.add(new URL(siteUrl).hostname);
    } catch {
      // Ignore invalid site URL env and keep default allow list.
    }
  }

  return allowedHosts;
}

function isAllowedUploadUrl(value: string, allowedHosts: Set<string>) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && allowedHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

async function sendEstimatorEmails({
  fullName,
  email,
  phone,
  address,
  preferredContact,
  projectType,
  budgetRange,
  foundUs,
  startTimeframe,
  projectId,
  snapshot,
}: {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  preferredContact: string;
  projectType: string;
  budgetRange: string;
  foundUs: string;
  startTimeframe: string;
  projectId: string;
  snapshot: Record<string, string | string[]>;
}) {
  if (!isResendEmailConfigured()) {
    throw new Error("Estimator email is not configured. Set RESEND_API_KEY in .env.");
  }

  const from = process.env.RESEND_FROM ?? "2A Construction <quotes@2aconstruction.co.uk>";
  const to = process.env.CONTACT_TO ?? "2a.construction.uk@gmail.com";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://2aconstruction.co.uk";
  const portfolioUrl = `${siteUrl}/portfolio/all`;
  const logoUrl = `${siteUrl}/2a_l.png`;
  const detailsRows = Object.entries(snapshot)
    .map(([key, value]) => {
      const readableKey = key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
      const readableValue = Array.isArray(value) ? value.join(", ") : value;
      return `<tr><td style="padding:6px;border:1px solid #ddd;"><b>${escapeHtml(readableKey)}</b></td><td style="padding:6px;border:1px solid #ddd;">${escapeHtml(readableValue)}</td></tr>`;
    })
    .join("");

  const adminEmailPromise = sendResendEmail({
    from,
    to,
    subject: `New estimator form submitted by ${fullName}`,
    replyTo: email,
    text: [
      "New estimator form has been sent in your account.",
      "",
      `Project ID: ${projectId}`,
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      `Address: ${address}`,
      `Preferred contact: ${preferredContact}`,
      `Project type: ${projectType}`,
      budgetRange ? `Budget range: ${budgetRange}` : null,
      foundUs ? `Where they found us: ${foundUs}` : null,
      startTimeframe ? `Looking to start: ${startTimeframe}` : null,
    ].filter(Boolean).join("\n"),
    html: `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; color:#171717;">
        <h2>New estimator form has been sent in your account</h2>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
          <tr><td style="padding:6px;border:1px solid #ddd;"><b>Project ID</b></td><td style="padding:6px;border:1px solid #ddd;">${escapeHtml(projectId)}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;"><b>Name</b></td><td style="padding:6px;border:1px solid #ddd;">${escapeHtml(fullName)}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;"><b>Email</b></td><td style="padding:6px;border:1px solid #ddd;">${escapeHtml(email)}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;"><b>Phone</b></td><td style="padding:6px;border:1px solid #ddd;">${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;"><b>Address</b></td><td style="padding:6px;border:1px solid #ddd;">${escapeHtml(address)}</td></tr>
          <tr><td style="padding:6px;border:1px solid #ddd;"><b>Preferred contact</b></td><td style="padding:6px;border:1px solid #ddd;">${escapeHtml(preferredContact)}</td></tr>
          ${detailsRows}
        </table>
      </div>
    `,
  });

  const clientEmailPromise = sendResendEmail({
      from,
      to: email,
      subject: "We received your 2A Construction estimator request",
      replyTo: to,
      text: [
        `Hi ${fullName},`,
        "",
        "Thank you for sending your project details to 2A Construction Ltd.",
        "We have received your details and will review the information provided.",
        "I’ll be in touch when we have a suitable project scope to price.",
        "",
        `Project type: ${projectType}`,
        budgetRange ? `Budget range: ${budgetRange}` : null,
        startTimeframe ? `Looking to start: ${startTimeframe}` : null,
        "",
        `In the meantime, you can see our projects here: ${portfolioUrl}`,
        "",
        "Kind regards,",
        "Alex",
        "2A Construction Ltd",
        "",
        "Loft Conversions • Extensions • Refurbishments • Roofing",
        "Phone: +44(0)7903095967",
        "Email: 2A.CONSTRUCTION.UK@GMAIL.COM",
        `Website: ${siteUrl}`,
      ].filter(Boolean).join("\n"),
      html: `
        <div style="margin:0;padding:0;background:#f4f4f2;font-family:Arial,Helvetica,sans-serif;color:#171717;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;margin:0;padding:24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e5e5;">
                  <tr>
                    <td style="background:#0b0b0b;padding:24px 28px;">
                      <img src="${logoUrl}" alt="2A Construction Ltd" width="150" style="display:block;height:auto;margin:0 0 18px 0;" />
                      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f5c542;font-weight:700;">Estimator request received</div>
                      <h1 style="margin:10px 0 0 0;color:#ffffff;font-size:28px;line-height:1.2;font-weight:800;">Thank you, ${escapeHtml(fullName)}</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:30px 28px 22px 28px;">
                      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.65;color:#333333;">Thank you for sending your project details to <strong>2A Construction Ltd</strong>.</p>
                      <p style="margin:0 0 22px 0;font-size:16px;line-height:1.65;color:#333333;">We have received your details and will review the information provided. I’ll be in touch when we have a suitable project scope to price.</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;margin:22px 0;background:#faf7ef;border:1px solid #f0d78a;border-radius:14px;overflow:hidden;">
                        <tr>
                          <td style="padding:14px 16px;font-size:13px;color:#6b5a1a;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Project type</td>
                          <td style="padding:14px 16px;font-size:15px;color:#171717;font-weight:700;text-align:right;">${escapeHtml(projectType)}</td>
                        </tr>
                        ${budgetRange ? `<tr><td style="padding:14px 16px;border-top:1px solid #f0d78a;font-size:13px;color:#6b5a1a;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Budget range</td><td style="padding:14px 16px;border-top:1px solid #f0d78a;font-size:15px;color:#171717;font-weight:700;text-align:right;">${escapeHtml(budgetRange)}</td></tr>` : ""}
                        ${startTimeframe ? `<tr><td style="padding:14px 16px;border-top:1px solid #f0d78a;font-size:13px;color:#6b5a1a;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Looking to start</td><td style="padding:14px 16px;border-top:1px solid #f0d78a;font-size:15px;color:#171717;font-weight:700;text-align:right;">${escapeHtml(startTimeframe)}</td></tr>` : ""}
                      </table>
                      <p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:#555555;">In the meantime, you can view examples of our loft conversions, extensions, refurbishments and roofing projects.</p>
                      <a href="${portfolioUrl}" style="display:inline-block;background:#f5c542;color:#111111;text-decoration:none;font-weight:800;font-size:15px;padding:13px 20px;border-radius:999px;">View our portfolio</a>
                      <div style="margin-top:30px;font-size:15px;line-height:1.7;color:#333333;">
                        <p style="margin:0;">Kind regards,</p>
                        <p style="margin:0;font-weight:800;">Alex</p>
                        <p style="margin:0;">2A Construction Ltd</p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#111111;padding:22px 28px;color:#ffffff;">
                      <p style="margin:0 0 12px 0;color:#f5c542;font-size:13px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Loft Conversions • Extensions • Refurbishments • Roofing</p>
                      <p style="margin:0 0 6px 0;font-size:14px;line-height:1.5;">Phone: <a href="tel:+447903095967" style="color:#ffffff;text-decoration:none;">+44(0)7903095967</a></p>
                      <p style="margin:0 0 6px 0;font-size:14px;line-height:1.5;">Email: <a href="mailto:2A.CONSTRUCTION.UK@GMAIL.COM" style="color:#ffffff;text-decoration:none;">2A.CONSTRUCTION.UK@GMAIL.COM</a></p>
                      <p style="margin:0 0 18px 0;font-size:14px;line-height:1.5;">Website: <a href="${siteUrl}" style="color:#ffffff;text-decoration:none;">2A Construction</a></p>
                      <p style="margin:0 0 10px 0;font-size:11px;line-height:1.6;color:#b8b8b8;">2A CONSTRUCTION LTD (England & Wales No. 15102296). Registered office: 3 Devonshire Close, London N13 4QT. This email and any attachments are confidential and may be legally privileged. If you are not the intended recipient, please inform the sender immediately, delete it from your systems, and refrain from copying or disclosing it.</p>
                      <p style="margin:0 0 10px 0;font-size:11px;line-height:1.6;color:#b8b8b8;">While we use reasonable measures to reduce risks, email can be intercepted, altered, or contain malware. You should scan attachments before opening. 2A CONSTRUCTION LTD is not liable for losses caused by transmission errors, unauthorised access, or malware, except where liability cannot be excluded by law.</p>
                      <p style="margin:0 0 10px 0;font-size:11px;line-height:1.6;color:#b8b8b8;">Nothing in this email constitutes a binding agreement unless expressly confirmed in writing by a Director of 2A CONSTRUCTION LTD. Emails may be monitored and retained for compliance, security, and training. Our privacy practices are described in our Privacy Notice, available on request or via our website.</p>
                      <p style="margin:0;font-size:11px;line-height:1.6;color:#91c788;">Please consider the environment before printing this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </div>
      `,
    });

  const [adminEmailResult, clientEmailResult] = await Promise.allSettled([
    adminEmailPromise,
    clientEmailPromise,
  ]);

  if (clientEmailResult.status === "rejected") {
    console.warn("Estimator client confirmation email skipped. Verify a Resend domain before sending to client addresses.");
  }

  if (adminEmailResult.status === "rejected") {
    throw adminEmailResult.reason;
  }
}

async function sendResendEmail({
  from,
  to,
  subject,
  replyTo,
  text,
  html,
}: {
  from: string;
  to: string;
  subject: string;
  replyTo?: string;
  text: string;
  html: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      reply_to: replyTo,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${errorText}`);
  }
}

function isResendEmailConfigured() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  return !!apiKey && apiKey.startsWith("re_");
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
  const id = formData.get("id") as string;

  const hero = await prisma.heroVideo.findUnique({
    where: { id },
  });

  if (!hero) return;

  // delete video and poster (both may be null)
  if (hero.videoUrl) {
    await deleteFile(hero.videoUrl);
  }

  if (hero.posterUrl) {
    await deleteFile(hero.posterUrl);
  }

  await prisma.heroVideo.delete({
    where: { id },
  });
  redirect("/dashboard/hero-videos");
}

export async function submitEstimator(formData: FormData) {
  const honey = getFormString(formData, "company");
  if (honey) return { ok: true, message: "Thanks, your estimator request has been sent." };

  const fullName = getFormString(formData, "fullName");
  const email = normalizeEmail(getFormString(formData, "email"));
  const phone = getFormString(formData, "phone");
  const houseNumber = getFormString(formData, "houseNumber");
  const street = getFormString(formData, "street");
  const postcode = getFormString(formData, "postcode");
  const preferredContact = getFormString(formData, "preferredContact");
  const projectType = getFormString(formData, "projectType");
  const budgetRange = getFormString(formData, "budgetRange");
  const foundUs = getFormString(formData, "foundUs");
  const startTimeframe = getFormString(formData, "startTimeframe");
  const termsAccepted = formData.get("termsAccepted") === "on";
  const marketingAccepted = formData.get("marketingAccepted") === "on";

  if (!fullName || !email || !phone || !houseNumber || !street || !postcode || !preferredContact || !projectType || !termsAccepted || !marketingAccepted) {
    return { ok: false, message: "Please complete the required contact details and consent boxes." };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const [firstName, ...lastNameParts] = fullName.split(" ");
  const address = [houseNumber, street, postcode].filter(Boolean).join(", ");
  const estimatorData = formDataToSnapshot(formData);

  try {
    const created = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findFirst({
        where: { email },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            id: randomUUID(),
            email,
            firstName: firstName || fullName,
            lastName: lastNameParts.join(" "),
            profileImage: "",
          },
        });
      }

      const client = await tx.client.create({
        data: {
          userId: user.id,
          fullName,
          email,
          phone,
          houseNumber,
          street,
          postcode,
          preferredContact,
          address,
          foundUs,
          startTimeframe,
          termsAccepted,
          marketingAccepted,
          projects: {
            create: {
              projectType,
              status: "review",
              priceEstimated: budgetRange,
              finalPrice: null,
              formData: estimatorData,
            },
          },
        },
        include: {
          projects: true,
        },
      });

      return {
        client,
        project: client.projects[0],
      };
    });

    void sendEstimatorEmails({
      fullName,
      email,
      phone,
      address,
      preferredContact,
      projectType,
      budgetRange,
      foundUs,
      startTimeframe,
      projectId: created.project.id,
      snapshot: estimatorData,
    }).catch((emailError) => {
      console.error("Estimator email failed:", emailError);
    });

    return {
      ok: true,
      emailSent: true,
      message: "Thanks, your estimator request has been saved and the confirmation is on its way.",
    };
  } catch (err) {
    console.error("Estimator submit failed:", err);
    return { ok: false, message: "Sorry, we could not send your estimator request. Please try again or contact us directly." };
  }
}

export async function saveClientProjectPortal(formData: FormData) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const admins = process.env.ADMIN_EMAILS?.split(",").map((email) => email.trim().toLowerCase()) ?? [];

  if (!user?.email || !admins.includes(user.email.toLowerCase())) {
    return { ok: false, message: "You are not allowed to update client projects." };
  }

  const clientProjectId = getFormString(formData, "clientProjectId");

  if (!clientProjectId) {
    return { ok: false, message: "Missing client project id." };
  }

  const currentStage = getFormString(formData, "currentStage") as ClientPortalStage;
  const phasesJson = getFormString(formData, "phasesJson");
  const parsedPhases = parsePhaseInputs(phasesJson);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.clientProject.update({
        where: { id: clientProjectId },
        data: {
          dashboardTitle: getFormString(formData, "dashboardTitle") || null,
          introTitle: getFormString(formData, "introTitle") || null,
          introMessage: getFormString(formData, "introMessage") || null,
          currentStage: Object.values(ClientPortalStage).includes(currentStage) ? currentStage : "introduction",
          siteVisitDate: getDateOrNull(getFormString(formData, "siteVisitDate")),
          agreementDate: getDateOrNull(getFormString(formData, "agreementDate")),
          plannedStartDate: getDateOrNull(getFormString(formData, "plannedStartDate")),
          targetCompletionDate: getDateOrNull(getFormString(formData, "targetCompletionDate")),
          progressPercent: getBoundedInt(getFormString(formData, "progressPercent"), 0, 100),
          isPortalVisible: formData.get("isPortalVisible") === "on",
          adminSummary: getFormString(formData, "adminSummary") || null,
          clientNotes: getFormString(formData, "clientNotes") || null,
          priceEstimated: getFormString(formData, "priceEstimated") || null,
          finalPrice: getFormString(formData, "finalPrice") || null,
        },
      });

      await tx.clientProjectPhase.deleteMany({
        where: { clientProjectId },
      });

      if (parsedPhases.length > 0) {
        await tx.clientProjectPhase.createMany({
          data: parsedPhases.map((phase) => ({
            clientProjectId,
            title: phase.title,
            status: phase.status,
            phaseOrder: phase.phaseOrder,
            targetDays: phase.targetDays,
            targetDate: phase.targetDate,
            jobs: phase.jobs,
            notes: phase.notes || null,
            images: phase.images,
          })),
        });
      }
    });

    return { ok: true, message: "Client project dashboard updated." };
  } catch (error) {
    console.error("Client project portal save failed:", error);
    return { ok: false, message: "Could not update the client project dashboard." };
  }
}

function getDateOrNull(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getBoundedInt(value: string, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

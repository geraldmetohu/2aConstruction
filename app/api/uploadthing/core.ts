import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

/* -------------------------------------------
   ALLOWED ADMIN EMAILS
-------------------------------------------- */
const allowedEmails = [
  "geraldmetohu@gmail.com",
  "hasanajaleksios@icloud.com",
  "ensisako11@gmail.com",
];

/* -------------------------------------------
   ADMIN CHECK
-------------------------------------------- */
async function requireAdmin() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  // Check user is logged in
  if (!user || !user.email) {
    throw new UploadThingError("Unauthorized");
  }

  // Check email whitelist
  if (!allowedEmails.includes(user.email)) {
    throw new UploadThingError("Unauthorized");
  }

  return { userId: user.id };
}

/* -------------------------------------------
   UPLOAD COMPLETE HANDLER
   (Use UploadThing's file object safely)
-------------------------------------------- */
function onComplete({ metadata, file }: { metadata: { userId: string }; file: any }) {
  console.log("Upload complete for:", metadata.userId);
  console.log("File URL:", file.url);

  return {
    uploadedBy: metadata.userId,
    url: file.url,
  };
}

/* -------------------------------------------
   FILE ROUTER
-------------------------------------------- */
export const ourFileRouter = {
  /* -----------------------------------------
     MULTI IMAGE UPLOADER (GALLERY)
  -------------------------------------------- */
  imageUploader: f({
    image: {
      maxFileSize: "128MB",
      maxFileCount: 40,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  /* -----------------------------------------
     BANNER IMAGE (1x)
  -------------------------------------------- */
  bannerImageRoute: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  /* -----------------------------------------
     BEFORE IMAGE (1x)
  -------------------------------------------- */
  beforeImageRoute: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  /* -----------------------------------------
     AFTER IMAGE (1x)
  -------------------------------------------- */
  afterImageRoute: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  /* -----------------------------------------
     HERO VIDEO (1x MP4/WebM)
  -------------------------------------------- */
  heroVideoRoute: f({
    video: {
      maxFileSize: "128MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

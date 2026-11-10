import { getAuthSession } from "@/app/lib/auth/session.server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTApi } from "uploadthing/server";

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
  const { getUser } = getAuthSession();
  const user = await getUser();

  if (!user || !user.email) {
    throw new UploadThingError("Unauthorized: no user");
  }

  if (!allowedEmails.includes(user.email)) {
    throw new UploadThingError("Unauthorized: not allowed");
  }

  return { userId: user.id };
}

/** Snag photos: any signed-in account (clients photograph snags in their portal; the snag itself checks the project). */
async function requireSignedIn() {
  const user = await getAuthSession().getUser();
  if (!user?.email) throw new UploadThingError("Please sign in first");
  return { userId: user.email };
}

async function allowEstimatorUpload() {
  return { userId: "estimator-form" };
}

/* -------------------------------------------
   UPLOAD COMPLETE (Return URL)
-------------------------------------------- */
function onComplete({
  metadata,
  file,
}: {
  metadata: { userId: string };
  file: any;
}) {
  console.log("Upload complete for:", metadata.userId);
  console.log("File URL:", file?.url ?? file?.ufsUrl);

  return {
    uploadedBy: metadata.userId,
    url: file?.url ?? file?.ufsUrl,
  };
}

/* -------------------------------------------
   FILE ROUTER
-------------------------------------------- */
export const ourFileRouter = {
  imageUploader: f({
    image: {
      maxFileSize: "128MB",
      maxFileCount: 40,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  bannerImageRoute: f({
    image: {
      maxFileSize: "32MB", // photos are shrunk in the browser before upload
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  beforeImageRoute: f({
    image: {
      maxFileSize: "32MB", // photos are shrunk in the browser before upload
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  afterImageRoute: f({
    image: {
      maxFileSize: "32MB", // photos are shrunk in the browser before upload
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  heroVideoRoute: f({
    video: {
      maxFileSize: "128MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  /* Job documents: plans, drawings, contracts, certificates (admin only). */
  documentUploader: f({
    pdf: { maxFileSize: "64MB", maxFileCount: 20 },
    image: { maxFileSize: "32MB", maxFileCount: 20 },
    text: { maxFileSize: "8MB", maxFileCount: 20 },
    blob: { maxFileSize: "64MB", maxFileCount: 20 },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  snagPhotoRoute: f({
    image: { maxFileSize: "16MB", maxFileCount: 1 }, // shrunk in the browser before upload
  })
    .middleware(requireSignedIn)
    .onUploadComplete(onComplete),

  estimatorUploader: f({
    image: {
      maxFileSize: "32MB",
      maxFileCount: 10,
    },
    video: {
      maxFileSize: "64MB",
      maxFileCount: 6,
    },
    pdf: {
      maxFileSize: "32MB",
      maxFileCount: 10,
    },
    text: {
      maxFileSize: "8MB",
      maxFileCount: 10,
    },
    blob: {
      maxFileSize: "32MB",
      maxFileCount: 10,
    },
  })
    .middleware(allowEstimatorUpload)
    .onUploadComplete(onComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

/* -------------------------------------------
   GLOBAL DELETE FUNCTION (ANY FILE)
-------------------------------------------- */
export const deleteFile = async (url: string) => {
  try {
    const parsed = new URL(url);
    const key = parsed.pathname.startsWith("/f/")
      ? parsed.pathname.slice(3)
      : url.split("/f/")[1];

    if (!key) {
      throw new UploadThingError("Invalid file URL");
    }

    const utapi = new UTApi();
    await utapi.deleteFiles(key);

    return { success: true };
  } catch (err) {
    console.error("Delete failed:", err);
    throw new UploadThingError(
      err instanceof Error ? err.message : "Delete failed"
    );
  }
};

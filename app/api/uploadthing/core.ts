import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

// Small helper to keep auth DRY (same check you already use)
async function requireAdmin() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  if (!user || user.email !== "geraldmetohu@gmail.com") {
    throw new UploadThingError("Unauthorized");
  }
  return { userId: user.id };
}

// Shared completion logger/return payload
function onComplete({ metadata, file }: { metadata: { userId: string }; file: { url: string } }) {
  console.log("Upload complete for userId:", metadata.userId);
  console.log("file url", file.url);
  // Send url back to client too
  return { uploadedBy: metadata.userId, url: file.url };
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Generic multi-image uploader
  imageUploader: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 40,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  // Banner images (1x image)
  bannerImageRoute: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  // Before image (1x image)
  beforeImageRoute: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  // After image (1x image)
  afterImageRoute: f({
    image: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  // NEW: Hero video (MP4/WebM) for the homepage hero
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

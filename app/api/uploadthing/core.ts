import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
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
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.email) {
    throw new UploadThingError("Unauthorized: no user");
  }

  if (!allowedEmails.includes(user.email)) {
    throw new UploadThingError("Unauthorized: not allowed");
  }

  return { userId: user.id };
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
  console.log("File URL:", file?.url);

  return {
    uploadedBy: metadata.userId,
    url: file?.url,
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
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  beforeImageRoute: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(requireAdmin)
    .onUploadComplete(onComplete),

  afterImageRoute: f({
    image: {
      maxFileSize: "8MB",
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
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

/* -------------------------------------------
   GLOBAL DELETE FUNCTION (ANY FILE)
-------------------------------------------- */
export const deleteFile = async (url: string) => {
  try {
    const key = url.split("/f/")[1];

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

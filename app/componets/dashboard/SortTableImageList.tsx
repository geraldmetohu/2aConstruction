"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import { XIcon } from "lucide-react";
import { UploadDropzone } from "@/app/lib/uploadthing";

interface SortTableImageListProps {
  images: string[];
  setImages: React.Dispatch<React.SetStateAction<string[]>>;
  onDelete: (index: number) => void;
}


function SortTableImage({
  url,
  index,
  onDelete,
}: {
  url: string;
  index: number;
  onDelete: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: url,
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative w-[100px] h-[100px] cursor-move"
    >
      <Image
        src={url}
        alt="Project Image"
        width={100}
        height={100}
        className="w-full h-full object-cover rounded-lg border"
      />
      <button
        type="button"
        onClick={() => onDelete(index)}
        className="absolute -top-3 -right-3 bg-red-500 p-2 rounded-full text-white"
      >
        <XIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function SortTableImageList({
  images,
  setImages,
  onDelete,
}: SortTableImageListProps) {
  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;

        const oldIndex = images.indexOf(active.id as string);
        const newIndex = images.indexOf(over.id as string);

        if (oldIndex === -1 || newIndex === -1) return;

        setImages(arrayMove(images, oldIndex, newIndex));
      }}
    >
      <SortableContext items={images} strategy={rectSortingStrategy}>
        <div className="flex flex-wrap gap-4">
          {images.map((url, index) => (
            <SortTableImage
              key={url}
              url={url}
              index={index}
              onDelete={onDelete}
            />
          ))}

          {/* Always-visible upload box to add more images */}
          <div className="w-[100px] h-[100px] border rounded-lg flex items-center justify-center">
            <UploadDropzone
              endpoint="imageUploader"
onClientUploadComplete={(files: any[]) => {
  const urls = files.map((file: any) => {
    if (file.url) return file.url;
    if (file.serverData?.url) return file.serverData.url;
    return ""; // fallback
  });

  setImages((prev) => [...prev, ...urls]);
}}



              onUploadError={(error) => {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Upload failed. Please try again.";

                alert(message);
              }}

            />
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}

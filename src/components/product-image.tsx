import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Optimised product image, with a quiet placeholder when none is uploaded. */
export function ProductImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-sand", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted/60">
          <ImageIcon className="size-8" aria-hidden />
          <span className="sr-only">{alt}</span>
        </div>
      )}
    </div>
  );
}

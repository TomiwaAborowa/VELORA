"use client";

import { useState } from "react";
import { ProductImage } from "@/components/product-image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-3">
      <ProductImage
        src={images[active]}
        alt={images.length > 1 ? `${name} — image ${active + 1} of ${images.length}` : name}
        sizes="(min-width: 1024px) 50vw, 100vw"
        priority
        className="aspect-square rounded-3xl"
      />
      {images.length > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {images.map((src, index) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1}`}
                aria-pressed={index === active}
                className={cn(
                  "block w-full overflow-hidden rounded-xl ring-offset-2 ring-offset-paper",
                  index === active ? "ring-2 ring-ink" : "opacity-70 hover:opacity-100",
                )}
              >
                <ProductImage src={src} alt="" sizes="96px" className="aspect-square" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

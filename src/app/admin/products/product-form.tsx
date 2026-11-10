"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Alert, Button, Field, fieldA11y, Input, Select, Textarea } from "@/components/ui";
import { useApiForm } from "@/components/use-api-form";
import { api, errorMessage } from "@/lib/client-api";
import type { Category, Product } from "@/lib/types";
import { slugify } from "@/lib/utils";

const MAX_IMAGES = 6;

export function ProductForm({ product, categories }: { product?: Product; categories: Category[] }) {
  const router = useRouter();
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [slug, setSlug] = useState(product?.slug ?? "");
  const fileInput = useRef<HTMLInputElement>(null);

  const { pending, error, fieldError, onSubmit } = useApiForm(async (values, form) => {
    const payload = {
      name: values.name,
      slug: values.slug,
      description: values.description,
      price: values.price,
      stock: values.stock,
      categoryId: values.categoryId,
      images,
      isActive: (form.elements.namedItem("isActive") as HTMLInputElement).checked,
    };
    if (product) {
      await api(`/api/products/${product.id}`, { method: "PATCH", json: payload });
    } else {
      await api("/api/products", { method: "POST", json: payload });
    }
    router.push("/admin/products");
    router.refresh();
  });

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    setUploading(true);
    try {
      const room = MAX_IMAGES - images.length;
      for (const file of [...files].slice(0, room)) {
        const body = new FormData();
        body.append("file", file);
        const { url } = await api<{ url: string }>("/api/admin/uploads", { method: "POST", body });
        setImages((current) => [...current, url]);
      }
      if (files.length > room) setUploadError(`Only ${MAX_IMAGES} images are allowed per product.`);
    } catch (e) {
      setUploadError(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const imagesError = fieldError("images");

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        <Field id="name" label="Name" error={fieldError("name")}>
          <Input
            {...fieldA11y("name", fieldError("name"))}
            defaultValue={product?.name}
            required
            onChange={(e) => {
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </Field>
        <Field id="slug" label="URL slug" error={fieldError("slug")} hint="Used in the product’s web address.">
          <Input
            {...fieldA11y("slug", fieldError("slug"))}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
          />
        </Field>
        <Field id="description" label="Description" error={fieldError("description")}>
          <Textarea {...fieldA11y("description", fieldError("description"))} defaultValue={product?.description} rows={6} maxLength={5000} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="price" label="Price (₦)" error={fieldError("price")}>
            <Input {...fieldA11y("price", fieldError("price"))} defaultValue={product?.price} type="number" min="0" step="0.01" inputMode="decimal" required />
          </Field>
          <Field id="stock" label="Stock" error={fieldError("stock")}>
            <Input {...fieldA11y("stock", fieldError("stock"))} defaultValue={product?.stock ?? 0} type="number" min="0" step="1" inputMode="numeric" required />
          </Field>
          <Field id="categoryId" label="Category" error={fieldError("categoryId")}>
            <Select {...fieldA11y("categoryId", fieldError("categoryId"))} defaultValue={product?.category_id ?? ""}>
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>
      </div>

      <div className="space-y-6">
        <fieldset className="rounded-2xl border border-line bg-surface p-5">
          <legend className="px-1 text-sm font-medium">Images</legend>
          <p className="text-xs text-muted">JPEG, PNG, WebP or AVIF, up to 5 MB. The first image is the cover.</p>
          {images.length > 0 && (
            <ul className="mt-4 grid grid-cols-3 gap-2">
              {images.map((src, index) => (
                <li key={src} className="relative aspect-square overflow-hidden rounded-lg bg-sand">
                  <Image src={src} alt={`Product image ${index + 1}`} fill sizes="100px" className="object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((current) => current.filter((s) => s !== src))}
                    className="absolute right-1 top-1 rounded-full bg-ink/80 p-1 text-white hover:bg-ink"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-surface/90 px-1.5 text-[10px] font-medium">Cover</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {images.length < MAX_IMAGES && (
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted hover:border-ink/40 hover:text-ink focus-within:border-accent">
              {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
              {uploading ? "Uploading…" : "Upload images"}
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="sr-only"
                disabled={uploading}
                onChange={(e) => upload(e.target.files)}
              />
            </label>
          )}
          {(uploadError || imagesError) && <p className="mt-2 text-sm text-danger" role="alert">{uploadError ?? imagesError}</p>}
        </fieldset>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={product?.is_active ?? true}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm font-medium">Visible in store</span>
              <span className="block text-xs text-muted">Hidden products can’t be viewed or purchased.</span>
            </span>
          </label>
        </div>

        <Button type="submit" size="lg" loading={pending} disabled={uploading} className="w-full">
          {product ? "Save changes" : "Create product"}
        </Button>
      </div>
    </form>
  );
}

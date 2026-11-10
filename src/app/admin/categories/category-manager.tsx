"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Card, Field, fieldA11y, Input } from "@/components/ui";
import { useApiForm } from "@/components/use-api-form";
import { api, errorMessage } from "@/lib/client-api";
import type { Category } from "@/lib/types";

type Row = Category & { product_count: number };

export function CategoryManager({ categories }: { categories: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);

  const create = useApiForm(async (values, form) => {
    await api("/api/categories", {
      method: "POST",
      json: { name: values.name, slug: values.slug, description: values.description },
    });
    form.reset();
    router.refresh();
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <Card>
        {categories.length === 0 ? (
          <p className="p-6 text-sm text-muted">No categories yet. Add one to get started.</p>
        ) : (
          <ul className="divide-y divide-line">
            {categories.map((category) =>
              editing === category.id ? (
                <li key={category.id} className="p-5">
                  <EditCategory category={category} onDone={() => setEditing(null)} />
                </li>
              ) : (
                <CategoryRow key={category.id} category={category} onEdit={() => setEditing(category.id)} />
              ),
            )}
          </ul>
        )}
      </Card>

      <Card className="p-5 lg:self-start">
        <h2 className="mb-4 font-medium">Add category</h2>
        <form onSubmit={create.onSubmit} noValidate className="space-y-4">
          {create.error && <Alert tone="error">{create.error}</Alert>}
          <Field id="new-name" label="Name" error={create.fieldError("name")}>
            <Input {...fieldA11y("new-name", create.fieldError("name"))} name="name" required />
          </Field>
          <Field id="new-slug" label="Slug" optional hint="Generated from the name if left blank." error={create.fieldError("slug")}>
            <Input {...fieldA11y("new-slug", create.fieldError("slug"))} name="slug" />
          </Field>
          <Field id="new-description" label="Description" optional error={create.fieldError("description")}>
            <Input {...fieldA11y("new-description", create.fieldError("description"))} name="description" maxLength={500} />
          </Field>
          <Button type="submit" loading={create.pending} className="w-full">
            Add category
          </Button>
        </form>
      </Card>
    </div>
  );
}

function CategoryRow({ category, onEdit }: { category: Row; onEdit: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function remove() {
    const warning = category.product_count
      ? `${category.product_count} product(s) will become uncategorised.`
      : "This cannot be undone.";
    if (!window.confirm(`Delete “${category.name}”? ${warning}`)) return;
    setPending(true);
    try {
      await api(`/api/categories/${category.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      window.alert(errorMessage(e));
      setPending(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-5">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{category.name}</p>
        <p className="text-sm text-muted">
          /{category.slug} · {category.product_count} {category.product_count === 1 ? "product" : "products"}
        </p>
        {category.description && <p className="mt-1 text-sm text-ink/70">{category.description}</p>}
      </div>
      <Button variant="ghost" size="sm" onClick={onEdit}>
        Edit<span className="sr-only"> {category.name}</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={remove} loading={pending} className="text-danger hover:bg-danger-soft">
        Delete<span className="sr-only"> {category.name}</span>
      </Button>
    </li>
  );
}

function EditCategory({ category, onDone }: { category: Row; onDone: () => void }) {
  const router = useRouter();
  const prefix = `edit-${category.id}`;
  const { pending, error, fieldError, onSubmit } = useApiForm(async (values) => {
    await api(`/api/categories/${category.id}`, {
      method: "PATCH",
      json: { name: values.name, slug: values.slug, description: values.description },
    });
    onDone();
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${prefix}-name`} label="Name" error={fieldError("name")}>
          <Input {...fieldA11y(`${prefix}-name`, fieldError("name"))} name="name" defaultValue={category.name} required autoFocus />
        </Field>
        <Field id={`${prefix}-slug`} label="Slug" error={fieldError("slug")}>
          <Input {...fieldA11y(`${prefix}-slug`, fieldError("slug"))} name="slug" defaultValue={category.slug} />
        </Field>
      </div>
      <Field id={`${prefix}-description`} label="Description" optional error={fieldError("description")}>
        <Input {...fieldA11y(`${prefix}-description`, fieldError("description"))} name="description" defaultValue={category.description ?? ""} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={pending}>Save</Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

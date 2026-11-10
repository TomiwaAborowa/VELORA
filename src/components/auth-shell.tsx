import type { ReactNode } from "react";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-medium tracking-tight">{title}</h1>
      {description && <p className="mt-2 text-muted">{description}</p>}
      <div className="mt-8 rounded-2xl border border-line bg-surface p-6 sm:p-8">{children}</div>
      {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
    </div>
  );
}

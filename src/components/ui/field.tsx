import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-2 block text-sm font-semibold text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border bg-white px-3.5 text-sm shadow-[0_1px_1px_rgba(20,40,28,.02)] placeholder:text-[#9aa29d] focus:border-brand focus:outline-2 focus:outline-brand/15",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-xl border bg-white px-3.5 text-sm focus:border-brand focus:outline-2 focus:outline-brand/15",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-sm placeholder:text-[#9aa29d] focus:border-brand focus:outline-2 focus:outline-brand/15",
        className,
      )}
      {...props}
    />
  );
}

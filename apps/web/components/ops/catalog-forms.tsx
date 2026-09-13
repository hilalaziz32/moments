"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createProduct, createVendor, type OpsResult } from "@/app/actions/ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

const CATEGORIES = ["cake","flowers","chocolate","hamper","voucher","electronics","apparel","book","toy","plant","card","custom"];
const MOMENTS = [
  ["birthday", "Birthday"], ["work_anniversary", "Work anniversary"], ["new_hire", "New hire"],
  ["promotion", "Promotion"], ["marriage", "Marriage"], ["new_baby", "New baby"],
  ["farewell", "Farewell"], ["eid_ul_fitr", "Eid ul Fitr"], ["eid_ul_adha", "Eid ul Adha"],
] as const;

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function useResultToast(state: OpsResult | null, message: string, form: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else {
      toast.success(message);
      form.current?.reset();
    }
  }, [state, message, form]);
}

export function VendorForm({ cities }: { cities: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createVendor, null as OpsResult | null);
  const ref = useRef<HTMLFormElement>(null);
  useResultToast(state, "Vendor added.", ref);

  return (
    <form ref={ref} action={action} className="space-y-4">
      <Field htmlFor="vendor-name" label="Name"><Input name="name" required /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="vendor-phone" label="Phone"><Input name="contactPhone" placeholder="0300 1234567" /></Field>
        <Field htmlFor="vendor-method" label="Orders placed by">
          <select name="orderingMethod" defaultValue="whatsapp" className={selectClass}>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="portal">Their website</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="vendor-lead" label="Lead time (days)"><Input name="leadDays" type="number" min={0} max={30} defaultValue={2} /></Field>
        <Field htmlFor="vendor-fee" label="Delivery fee (PKR)"><Input name="deliveryFee" type="number" min={0} defaultValue={0} /></Field>
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-ink">Delivers to</legend>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
          {cities.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="cityId" value={c.id} className="size-4 accent-[var(--state-active)]" />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add vendor"}</Button>
    </form>
  );
}

export function ProductForm({ vendors }: { vendors: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createProduct, null as OpsResult | null);
  const ref = useRef<HTMLFormElement>(null);
  useResultToast(state, "Product added.", ref);

  if (vendors.length === 0) {
    return <p className="text-sm text-ink-muted">Add a vendor first. Every product comes from one.</p>;
  }

  return (
    <form ref={ref} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field htmlFor="product-vendor" label="Vendor">
          <select name="vendorId" required className={selectClass}>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        <Field htmlFor="product-category" label="Category">
          <select name="category" required className={selectClass}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c[0]!.toUpperCase() + c.slice(1)}</option>)}
          </select>
        </Field>
      </div>
      <Field htmlFor="product-name" label="Name" hint="As the customer and the recipient will see it.">
        <Input name="name" required placeholder="Eggless chocolate cake, 1 lb" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field htmlFor="product-cost" label="Vendor charges us (PKR)"><Input name="costRupees" type="number" min={0} required /></Field>
        <Field htmlFor="product-price" label="Customer pays (PKR)"><Input name="priceRupees" type="number" min={100} required /></Field>
        <Field htmlFor="product-lead" label="Lead time (days)"><Input name="minLeadDays" type="number" min={0} max={30} defaultValue={1} /></Field>
      </div>

      <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
        <legend className="mb-2 text-sm font-medium text-ink">About it</legend>
        {[
          ["isDigital", "Digital (e-voucher): used for the same-day backup"],
          ["isFood", "Food"],
          ["isHalal", "Halal certified"],
          ["isEggless", "Eggless"],
          ["isVegetarian", "Vegetarian"],
          ["containsNuts", "Contains nuts"],
        ].map(([name, label]) => (
          <label key={name} className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name={name} className="size-4 accent-[var(--state-active)]" />
            {label}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
        <legend className="mb-2 text-sm font-medium text-ink">Suitable for</legend>
        {MOMENTS.map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="momentKey" value={key} className="size-4 accent-[var(--state-active)]" />
            {label}
          </label>
        ))}
      </fieldset>

      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add product"}</Button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitConfirmation } from "@/app/actions/public-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

export interface ConfirmFormProps {
  token: string;
  cities: { id: string; name: string }[];
  current: {
    addressPreview: string | null;
    shirtSize: string | null;
    halalOnly: boolean;
    isVegetarian: boolean;
    needsEggless: boolean;
    whatsappOptIn: boolean;
    celebrationOptOut: boolean;
  };
}

export function ConfirmForm({ token, cities, current }: ConfirmFormProps) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="mt-8 rounded-lg border border-rule bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-6 text-state-done" aria-hidden />
        <h2 className="mt-3 text-base font-semibold text-ink">That&rsquo;s all we needed</h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          You can come back to this link and change it any time before the day.
        </p>
      </div>
    );
  }

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        const values = {
          line1: String(fd.get("line1") ?? ""),
          line2: String(fd.get("line2") ?? "") || null,
          area: String(fd.get("area") ?? "") || null,
          landmark: String(fd.get("landmark") ?? "") || null,
          cityId: String(fd.get("cityId") ?? "") || null,
          cityText: String(fd.get("cityText") ?? "") || null,
          deliveryNotes: String(fd.get("deliveryNotes") ?? "") || null,
          recipientPhone: String(fd.get("recipientPhone") ?? "") || null,
          whatsappE164: String(fd.get("whatsappE164") ?? "") || null,
          whatsappOptIn: fd.get("whatsappOptIn") === "on",
          shirtSize: (String(fd.get("shirtSize") ?? "") || null) as never,
          halalOnly: fd.get("halalOnly") === "on",
          isVegetarian: fd.get("isVegetarian") === "on",
          needsEggless: fd.get("needsEggless") === "on",
          allergies: [],
          celebrationOptOut: fd.get("celebrationOptOut") === "on",
        };

        start(async () => {
          const res = await submitConfirmation(token, values);
          if (res.ok) setDone(true);
          else setError(res.error);
        });
      }}
    >
      {current.addressPreview && (
        <p className="rounded-md bg-surface-sunk px-3 py-2 text-xs text-ink-muted">
          We currently have <span className="text-ink">{current.addressPreview}</span>.
          Put the full address below, even if it hasn&rsquo;t changed.
        </p>
      )}

      <Field htmlFor="line1" label="Street address" hint="House or flat number, and the street.">
        <Input name="line1" required placeholder="House 12, Street 4" autoComplete="address-line1" />
      </Field>

      <Field htmlFor="area" label="Area or block" hint="e.g. DHA Phase 6, Gulberg III">
        <Input name="area" placeholder="DHA Phase 6" autoComplete="address-line2" />
      </Field>

      <Field htmlFor="landmark" label="Nearest landmark" hint="Riders find this more useful than a postcode.">
        <Input name="landmark" placeholder="opposite the bakery" />
      </Field>

      <Field htmlFor="cityId" label="City">
        <select
          name="cityId"
          required
          className="flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Choose your city…</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      <Field htmlFor="recipientPhone" label="Phone for the delivery" hint="So the rider can call if they can't find you.">
        <Input name="recipientPhone" type="tel" placeholder="+92 300 1234567" autoComplete="tel" />
      </Field>

      <fieldset className="space-y-2.5 rounded-lg border border-rule p-4">
        <legend className="px-1 text-sm font-medium text-ink">If there&rsquo;s food</legend>
        <Check name="halalOnly" defaultChecked={current.halalOnly} label="Halal only" />
        <Check name="needsEggless" defaultChecked={current.needsEggless} label="Eggless" />
        <Check name="isVegetarian" defaultChecked={current.isVegetarian} label="Vegetarian" />
      </fieldset>

      <Field htmlFor="shirtSize" label="Shirt size" hint="Only if something is ever clothing.">
        <select
          name="shirtSize"
          defaultValue={current.shirtSize ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Rather not say</option>
          {["XS","S","M","L","XL","XXL","XXXL"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>

      <div className="space-y-2.5 rounded-lg border border-rule p-4">
        <Check
          name="whatsappOptIn"
          defaultChecked={current.whatsappOptIn}
          label="You can message me on WhatsApp about deliveries"
        />
        {/*
          Always offered, always honoured. Some people genuinely do not want a
          company-wide message about their birthday, and the product is worse if
          it cannot hear that.
        */}
        <Check
          name="celebrationOptOut"
          defaultChecked={current.celebrationOptOut}
          label="I'd rather not be celebrated publicly"
        />
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save my details"}
      </Button>
      <p className="text-center text-xs text-ink-faint">
        Only your HR team and our delivery partner see this.
      </p>
    </form>
  );
}

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-ink">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-input accent-[var(--state-active)]"
      />
      {label}
    </label>
  );
}

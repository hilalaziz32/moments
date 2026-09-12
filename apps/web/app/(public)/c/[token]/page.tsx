import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmForm } from "@/components/public/confirm-form";

export const metadata: Metadata = { title: "Confirm your details" };
export const dynamic = "force-dynamic";

/**
 * THE GET HANDLER NEVER MUTATES.
 *
 * Outlook Safe Links, Gmail's image proxy and WhatsApp link previews all
 * PRE-FETCH urls. If opening this page consumed the token, Microsoft would burn
 * every single link before the employee ever clicked it. Only the POST action
 * increments use_count.
 */
export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = createAdminClient();

  const { data } = await db.rpc("resolve_action_token", { p_token: token } as never);
  const info = data as {
    valid: boolean; firstName?: string; orgName?: string; occursOn?: string;
    addressPreview?: string | null; hasAddress?: boolean; shirtSize?: string | null;
    halalOnly?: boolean; isVegetarian?: boolean; needsEggless?: boolean;
    whatsappOptIn?: boolean; celebrationOptOut?: boolean;
  } | null;

  // Invalid, expired, revoked and used-up all render identically, with a 200.
  // A 404 or a distinct message is an enumeration oracle just as much as a
  // different response body would be.
  if (!info?.valid) {
    return (
      <div className="rounded-lg border border-rule bg-card p-6 text-center">
        <h1 className="text-base font-semibold text-ink">This link isn&rsquo;t valid any more</h1>
        <p className="mt-2 text-sm text-ink-muted">
          It may have expired. Ask whoever sent it to you for a fresh one.
        </p>
      </div>
    );
  }

  const { data: cities } = await db
    .from("cities")
    .select("id, name")
    .eq("is_serviceable", true)
    .order("tier")
    .order("name");

  return (
    <div>
      <p className="text-xs text-ink-faint">{info.orgName}</p>
      <h1 className="mt-1 text-xl font-semibold text-ink">
        Hi {info.firstName}, where should we send things?
      </h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Your team has something planned. We only use this to get it to the right door.
      </p>

      <ConfirmForm
        token={token}
        cities={cities ?? []}
        current={{
          addressPreview: info.addressPreview ?? null,
          shirtSize: info.shirtSize ?? null,
          halalOnly: info.halalOnly ?? true,
          isVegetarian: info.isVegetarian ?? false,
          needsEggless: info.needsEggless ?? false,
          whatsappOptIn: info.whatsappOptIn ?? false,
          celebrationOptOut: info.celebrationOptOut ?? false,
        }}
      />
    </div>
  );
}

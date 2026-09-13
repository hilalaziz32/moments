import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { formatPKR } from "@moments/core/money";
import { requirePlatformStaff } from "@/lib/auth/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductForm, VendorForm } from "@/components/ops/catalog-forms";

export const metadata: Metadata = { title: "Catalogue" };
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  // The layout checks too, but a page that reads with the service-role key
  // defends itself rather than trusting where it was rendered from.
  await requirePlatformStaff();
  const db = createAdminClient();

  const [{ data: vendors }, { data: products }, { data: cities }] = await Promise.all([
    db.from("vendors").select("id, name, ordering_method, default_lead_days, is_active, vendor_city_coverage(city_id)").order("name"),
    db.from("gift_products")
      .select("id, name, category, cost_paisa, list_price_paisa, margin_paisa, margin_bps, is_food, is_halal_certified, is_eggless, is_digital, is_active, suitable_moment_keys, vendors(name)")
      .order("list_price_paisa"),
    db.from("cities").select("id, name").eq("is_serviceable", true).order("tier").order("name"),
  ]);

  const productList = products ?? [];
  const hasDigital = productList.some((p) => p.is_active && p.is_digital);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-ink">Catalogue</h1>

      {!hasDigital && (
        <p className="flex items-start gap-2 rounded-lg border border-state-failed/40 bg-state-failed/5 px-4 py-3 text-sm text-ink">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-state-failed" aria-hidden />
          There&rsquo;s no active digital gift. If an order isn&rsquo;t with a vendor on the morning of a
          moment, the same-day backup has nothing to send and that person gets nothing.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-rule bg-card">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <caption className="sr-only">Products</caption>
          <thead>
            <tr className="border-b border-rule text-xs text-ink-muted">
              <th scope="col" className="px-4 py-2.5 font-medium">Product</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Vendor</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Cost</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Price</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Margin</th>
            </tr>
          </thead>
          <tbody>
            {productList.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-muted">No products yet.</td></tr>
            )}
            {productList.map((p) => (
              <tr key={p.id} className="border-b border-rule last:border-0">
                <td className="px-4 py-3">
                  <span className="text-ink">{p.name}</span>
                  <span className="block text-xs text-ink-faint">
                    {[p.category, p.is_digital && "digital", p.is_halal_certified && "halal", p.is_eggless && "eggless", !p.is_active && "inactive"]
                      .filter(Boolean).join(", ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">{(p.vendors as unknown as { name: string } | null)?.name}</td>
                <td data-numeric className="px-4 py-3 text-right text-ink-muted">{formatPKR(p.cost_paisa)}</td>
                <td data-numeric className="px-4 py-3 text-right text-ink">{formatPKR(p.list_price_paisa)}</td>
                <td data-numeric className="px-4 py-3 text-right text-ink">
                  {formatPKR(p.margin_paisa ?? 0)}
                  <span className="ml-1 text-xs text-ink-faint">{((p.margin_bps ?? 0) / 100).toFixed(0)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Add a product</CardTitle></CardHeader>
          <CardContent>
            <ProductForm vendors={(vendors ?? []).filter((v) => v.is_active).map((v) => ({ id: v.id, name: v.name }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Add a vendor</CardTitle></CardHeader>
          <CardContent>
            <VendorForm cities={cities ?? []} />
            {(vendors ?? []).length > 0 && (
              <ul className="mt-6 space-y-1 border-t border-rule pt-4 text-sm">
                {(vendors ?? []).map((v) => (
                  <li key={v.id} className="flex justify-between gap-4">
                    <span className="text-ink">{v.name}</span>
                    <span className="text-ink-muted">
                      {(v.vendor_city_coverage as unknown as unknown[]).length} cities, {v.default_lead_days} day lead
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

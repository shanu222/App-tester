import { json, handleRouteError } from "@/lib/http";
import { requireAdmin } from "@/auth";
import { exportUsdTwelveEvidenceCsv, listUsdTwelveAdminCampaigns } from "@/lib/services/usd-twelve-package";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const campaignPublicId = url.searchParams.get("campaign") || "";
    if (url.searchParams.get("export") === "csv" && campaignPublicId) {
      const file = await exportUsdTwelveEvidenceCsv(campaignPublicId);
      return new Response(file.csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${file.filename}"`,
        },
      });
    }
    const campaigns = await listUsdTwelveAdminCampaigns();
    return json({ campaigns });
  } catch (error) {
    return handleRouteError(error);
  }
}

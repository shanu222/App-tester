import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { getApp } from "@/lib/services/apps";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const app = await getApp(user.id, id);
    return json({ app });
  } catch (error) {
    return handleRouteError(error);
  }
}

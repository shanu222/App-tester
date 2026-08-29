import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { removeOwnActivityLog } from "@/lib/audit";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const result = await removeOwnActivityLog(user.id, id);
    return json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

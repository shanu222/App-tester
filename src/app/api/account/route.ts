import { json, handleRouteError } from "@/lib/http";
import { requireUser } from "@/auth";
import { deleteTestLoopAccount } from "@/lib/services/account";

/** Permanently delete this TestLoop account. Never calls Google Play APIs. */
export async function DELETE() {
  try {
    const user = await requireUser();
    await deleteTestLoopAccount(user.id);
    return json({ deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

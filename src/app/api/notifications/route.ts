import { z } from "zod";
import { json, handleRouteError, parseJson } from "@/lib/http";
import { requireUser } from "@/auth";
import {
  deleteAllInboxItems,
  deleteInboxItem,
  listInbox,
  markAllInboxRead,
  setInboxItemRead,
} from "@/lib/services/inbox";

const bodySchema = z.object({
  action: z.enum(["mark-all-read", "set-read", "delete", "delete-all"]).optional(),
  id: z.string().min(1).max(80).optional(),
  read: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    return json(await listInbox(user.id));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseJson(request, bodySchema);
    const action = body.action ?? "mark-all-read";

    if (action === "mark-all-read") {
      const result = await markAllInboxRead(user.id);
      return json({ ok: true, ...result });
    }
    if (action === "delete-all") {
      const result = await deleteAllInboxItems(user.id);
      return json({ ok: true, ...result });
    }
    if (!body.id) return json({ error: "Notification required." }, 400);
    if (action === "set-read") {
      const result = await setInboxItemRead(user.id, body.id, body.read !== false);
      return json({ ok: true, ...result });
    }
    const result = await deleteInboxItem(user.id, body.id);
    return json({ ok: true, ...result });
  } catch (error) {
    return handleRouteError(error);
  }
}

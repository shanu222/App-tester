import { google } from "googleapis";
import { env } from "@/lib/env";
import { GROUPS_API_LIMITATION } from "@/lib/integrations/capabilities";
import type { AdapterResult, GroupMemberResult } from "@/lib/integrations/types";
import type { ServiceAccountJson } from "@/lib/integrations/play";

function directoryClient(sa: ServiceAccountJson, subject?: string) {
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [
      "https://www.googleapis.com/auth/admin.directory.group",
      "https://www.googleapis.com/auth/admin.directory.group.member",
    ],
    subject: subject || env.googleWorkspaceAdminEmail || undefined,
  });
  return google.admin({ version: "directory_v1", auth });
}

export function workspaceConfigured(sa?: ServiceAccountJson | null) {
  return Boolean(sa?.client_email && (env.googleWorkspaceAdminEmail || sa));
}

export async function addGroupMember(input: {
  sa: ServiceAccountJson;
  groupEmail: string;
  memberEmail: string;
  adminEmail?: string;
}): Promise<AdapterResult<GroupMemberResult>> {
  if (!input.sa?.client_email) {
    return {
      ok: false,
      error: GROUPS_API_LIMITATION,
      code: "GROUPS_UNAVAILABLE",
      unavailable: true,
      manualFallback: manualGroupInstructions(input.groupEmail, input.memberEmail),
    };
  }

  try {
    const admin = directoryClient(input.sa, input.adminEmail);
    try {
      await admin.members.insert({
        groupKey: input.groupEmail,
        requestBody: {
          email: input.memberEmail,
          role: "MEMBER",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/already exists|duplicate|409/i.test(message)) {
        throw error;
      }
    }

    let verified = false;
    try {
      const check = await admin.members.hasMember({
        groupKey: input.groupEmail,
        memberKey: input.memberEmail,
      });
      verified = Boolean(check.data.isMember);
    } catch {
      verified = false;
    }

    return {
      ok: true,
      data: {
        email: input.memberEmail,
        verified,
        manualRequired: !verified,
        detail: verified
          ? "Membership confirmed via Admin SDK Directory API."
          : "Insert succeeded or member already existed, but hasMember could not confirm. Verify in Google Groups.",
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: `${error instanceof Error ? error.message : "Group membership failed."} ${GROUPS_API_LIMITATION}`,
      code: "GROUPS_ADD_FAILED",
      unavailable: true,
      manualFallback: manualGroupInstructions(input.groupEmail, input.memberEmail),
    };
  }
}

export function manualGroupInstructions(groupEmail: string, memberEmail: string) {
  return [
    "Manual action required — TesterBridge cannot add this member automatically.",
    `1. Open https://groups.google.com and sign in as the group owner.`,
    `2. Open group ${groupEmail}.`,
    `3. Members → Add members.`,
    `4. Add ${memberEmail} as a member.`,
    `5. Return here and choose Confirm membership.`,
  ].join("\n");
}

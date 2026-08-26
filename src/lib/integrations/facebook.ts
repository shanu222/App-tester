import { env, isDemoMode } from "@/lib/env";
import {
  FACEBOOK_GROUP_LIMITATION,
  facebookManualGroupCapabilities,
  facebookPageCapabilities,
} from "@/lib/integrations/capabilities";
import type { AdapterResult, FacebookPostRecord } from "@/lib/integrations/types";

const GRAPH = `https://graph.facebook.com/${env.facebookGraphVersion}`;

export function facebookConfigured() {
  return Boolean(env.facebookClientId && env.facebookClientSecret);
}

export function facebookOAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.facebookClientId,
    redirect_uri: env.facebookRedirectUri,
    state,
    response_type: "code",
    scope: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_read_user_content",
      "pages_manage_engagement",
    ].join(","),
  });
  return `https://www.facebook.com/${env.facebookGraphVersion}/dialog/oauth?${params.toString()}`;
}

async function graph<T>(
  path: string,
  accessToken: string,
  init?: RequestInit & { search?: Record<string, string> },
): Promise<T> {
  const url = new URL(`${GRAPH}${path}`);
  url.searchParams.set("access_token", accessToken);
  if (init?.search) {
    for (const [key, value] of Object.entries(init.search)) {
      url.searchParams.set(key, value);
    }
  }
  const response = await fetch(url, {
    method: init?.method || "GET",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body,
  });
  const json = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok || json.error) {
    throw new Error(json.error?.message || `Facebook Graph error (${response.status})`);
  }
  return json;
}

export async function exchangeFacebookCode(code: string) {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("client_id", env.facebookClientId);
  url.searchParams.set("client_secret", env.facebookClientSecret);
  url.searchParams.set("redirect_uri", env.facebookRedirectUri);
  url.searchParams.set("code", code);
  const response = await fetch(url);
  const json = (await response.json()) as {
    access_token?: string;
    error?: { message?: string };
  };
  if (!json.access_token) {
    throw new Error(json.error?.message || "Facebook token exchange failed.");
  }
  return json.access_token;
}

export async function fetchFacebookPages(userToken: string) {
  const data = await graph<{
    data: Array<{
      id: string;
      name: string;
      access_token: string;
      tasks?: string[];
    }>;
  }>("/me/accounts", userToken, {
    search: { fields: "id,name,access_token,tasks" },
  });
  return data.data.map((page) => ({
    ...page,
    canRead: true,
    canComment: (page.tasks || []).some((task) =>
      ["MODERATE", "CREATE_CONTENT", "MANAGE"].includes(task),
    ),
    capabilities: facebookPageCapabilities(),
  }));
}

export async function searchPagePosts(input: {
  pageId: string;
  pageToken: string;
  sinceUnix: number;
}): Promise<AdapterResult<FacebookPostRecord[]>> {
  try {
    const data = await graph<{
      data: Array<{
        id: string;
        message?: string;
        created_time?: string;
        permalink_url?: string;
        from?: { id: string; name: string };
      }>;
    }>(`/${input.pageId}/feed`, input.pageToken, {
      search: {
        fields: "id,message,created_time,permalink_url,from",
        since: String(input.sinceUnix),
        limit: "50",
      },
    });
    return {
      ok: true,
      data: (data.data || [])
        .filter((post) => post.message)
        .map((post) => ({
          id: post.id,
          message: post.message || "",
          createdTime: post.created_time || null,
          permalink: post.permalink_url || null,
          fromName: post.from?.name || null,
          fromId: post.from?.id || null,
        })),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Facebook Page feed unavailable.",
      code: "FACEBOOK_FEED_ERROR",
    };
  }
}

export async function commentOnPagePost(input: {
  postId: string;
  pageToken: string;
  message: string;
}): Promise<AdapterResult<{ commentId: string }>> {
  try {
    const data = await graph<{ id: string }>(`/${input.postId}/comments`, input.pageToken, {
      method: "POST",
      search: { message: input.message },
    });
    if (!data.id) {
      return {
        ok: false,
        error: "Facebook did not return a comment ID.",
        code: "FACEBOOK_NO_COMMENT_ID",
      };
    }
    return { ok: true, data: { commentId: data.id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Facebook comment failed.",
      code: "FACEBOOK_COMMENT_ERROR",
    };
  }
}

export async function listPostComments(input: {
  postId: string;
  pageToken: string;
}): Promise<AdapterResult<Array<{ id: string; message: string; fromName?: string }>>> {
  try {
    const data = await graph<{
      data: Array<{ id: string; message?: string; from?: { name?: string } }>;
    }>(`/${input.postId}/comments`, input.pageToken, {
      search: { fields: "id,message,from", filter: "stream", limit: "50" },
    });
    return {
      ok: true,
      data: (data.data || []).map((item) => ({
        id: item.id,
        message: item.message || "",
        fromName: item.from?.name,
      })),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not read comments.",
      code: "FACEBOOK_COMMENTS_ERROR",
    };
  }
}

export function groupDiscoveryUnavailable(): AdapterResult<FacebookPostRecord[]> {
  return {
    ok: false,
    error: FACEBOOK_GROUP_LIMITATION,
    code: "FACEBOOK_GROUPS_API_DEPRECATED",
    unavailable: true,
    manualFallback:
      "Use Import post on Discovery: paste the post text, author name, and optional permalink. Generate a reply, copy it, and post it yourself in the Facebook Group.",
  };
}

export function demoFacebookPosts(): FacebookPostRecord[] {
  if (!isDemoMode()) return [];
  const now = Date.now();
  return [
    {
      id: "demo_post_net360_1",
      message:
        "I have built an Android app and need testers for Google Play closed testing. I can test yours too.",
      createdTime: new Date(now - 2 * 3600_000).toISOString(),
      permalink: "https://example.local/demo/facebook/post-1",
      fromName: "Ayesha K.",
      fromId: "demo_user_1",
    },
    {
      id: "demo_post_net360_2",
      message:
        "Looking for Android testers for my closed testing track. Need 12 testers. Reciprocal testing welcome.",
      createdTime: new Date(now - 5 * 3600_000).toISOString(),
      permalink: "https://example.local/demo/facebook/post-2",
      fromName: "Omar R.",
      fromId: "demo_user_2",
    },
    {
      id: "demo_post_unrelated",
      message: "We are hiring a full-time Android developer. Salary competitive. Apply now.",
      createdTime: new Date(now - 3 * 3600_000).toISOString(),
      permalink: "https://example.local/demo/facebook/post-3",
      fromName: "Recruitment Bot",
      fromId: "demo_user_3",
    },
  ];
}

export function sourceCapabilitiesForType(type: "PAGE" | "MANUAL_GROUP" | "IMPORTED") {
  if (type === "PAGE") return facebookPageCapabilities();
  return facebookManualGroupCapabilities();
}

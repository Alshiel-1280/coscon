import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthenticatedContext = {
  supabase: SupabaseClient;
  user: User;
  session: Session | null;
  googleAccessToken: string | null;
};

type DbError = {
  message: string;
  code?: string;
};

function inferDisplayName(user: User): string {
  const md = user.user_metadata ?? {};
  return (
    (typeof md.full_name === "string" && md.full_name) ||
    (typeof md.name === "string" && md.name) ||
    user.email?.split("@")[0] ||
    "User"
  );
}

function inferGoogleSub(user: User): string {
  const md = user.user_metadata ?? {};
  if (typeof md.sub === "string" && md.sub.length > 0) {
    return md.sub;
  }
  const identities = user.identities ?? [];
  const googleIdentity = identities.find((it) => it.provider === "google");
  if (googleIdentity?.identity_id) {
    return googleIdentity.identity_id;
  }
  return user.id;
}

function formatProfileSyncError(error: DbError): string {
  if (error.code === "42P01") {
    return "profiles table is missing. Apply docs/supabase_schema.sql in Supabase SQL Editor.";
  }
  if (error.code === "42501") {
    return "Permission denied by RLS while syncing profile. Re-apply RLS policies in docs/supabase_schema.sql.";
  }
  if (error.code === "23505") {
    return "Profile unique key conflict (email/google_sub). Check duplicates in profiles table.";
  }
  return error.message;
}

export async function ensureProfileForUser(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const email = user.email ?? `${user.id}@example.local`;
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      google_sub: inferGoogleSub(user),
      email,
      display_name: inferDisplayName(user),
      avatar_url:
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : null,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    const reason = formatProfileSyncError(error as DbError);
    throw new Error(`Failed to sync user profile: ${reason}`);
  }
}

export async function getAuthenticatedContext(): Promise<AuthenticatedContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }
  if (!user) {
    throw new Error("Unauthorized");
  }

  await ensureProfileForUser(supabase, user);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    supabase,
    user,
    session,
    googleAccessToken: session?.provider_token ?? null,
  };
}

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabasePublicEnv();
  return (
    url.startsWith("https://") &&
    !url.includes("your-project-ref") &&
    anonKey.length > 20 &&
    !anonKey.includes("your-supabase-anon-key")
  );
}

export function getPublicAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

export function getSupabaseServiceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: Service role key must never be accessed in browser code."
    );
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!key || key.includes("your-supabase-service-role-key")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }
  return key;
}

export function getAiProviderStatus(): {
  configured: boolean;
  provider: "gemini" | "openai" | null;
} {
  if (typeof window !== "undefined") {
    return { configured: false, provider: null };
  }
  const gemini = process.env.GEMINI_API_KEY?.trim() ?? "";
  if (gemini.length > 10) {
    return { configured: true, provider: "gemini" };
  }
  const openai = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (openai.length > 10) {
    return { configured: true, provider: "openai" };
  }
  return { configured: false, provider: null };
}

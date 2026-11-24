import { NextResponse } from "next/server";
import { getAuthenticatedSessionContext } from "@/lib/auth/session";
import { onboardingOrgSchema } from "@/lib/validators/part2";

export async function GET() {
  const session = await getAuthenticatedSessionContext();
  if (!session.configured) {
    return NextResponse.json(
      { error: "Supabase is not configured in .env.local." },
      { status: 503 }
    );
  }
  if (!session.user || !session.supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await session.supabase
    .from("organization_members")
    .select(
      `
      organization_id,
      role_key,
      status,
      organizations:organization_id (
        id,
        name,
        slug,
        status,
        created_at,
        business_settings (*),
        workspaces (*)
      )
    `
    )
    .eq("user_id", session.user.id)
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ organizations: data ?? [] });
}

export async function POST(request: Request) {
  const session = await getAuthenticatedSessionContext();
  if (!session.configured) {
    return NextResponse.json(
      {
        error:
          "Supabase is not configured. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before creating organizations.",
      },
      { status: 503 }
    );
  }
  if (!session.user || !session.supabase) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = onboardingOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const v = parsed.data;
  const { data, error } = await session.supabase.rpc(
    "create_organization_with_setup",
    {
      p_business_name: v.businessName,
      p_category_slug: v.categorySlug,
      p_country: v.country,
      p_currency: v.currency,
      p_timezone: v.timezone,
      p_address_line: v.addressLine,
      p_city: v.city,
      p_contact_email: v.contactEmail,
      p_contact_phone: v.contactPhone,
      p_logo_path: v.logoPath,
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ created: data }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';

const SUPPORT_URL = process.env.SUPPORT_SERVICE_URL || 'http://localhost:3012';
const BILLING_URL = process.env.BILLING_URL || 'http://localhost:3008';
const PLATFORM_URL = process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009';

async function requireSystemAdmin() {
  const user = await currentUser();
  if (!user || (user.publicMetadata as Record<string, unknown>)?.systemAdmin !== true) {
    return null;
  }
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const admin = await requireSystemAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orgId } = await params;
  const client = await clerkClient();

  try {
    // Fetch org info + members from Clerk
    const [org, membersRes] = await Promise.all([
      client.organizations.getOrganization({ organizationId: orgId }),
      client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        limit: 100,
      }),
    ]);

    const members = membersRes.data.map((m) => ({
      userId: m.publicUserData?.userId,
      firstName: m.publicUserData?.firstName,
      lastName: m.publicUserData?.lastName,
      imageUrl: m.publicUserData?.imageUrl,
      role: m.role,
      createdAt: m.createdAt,
    }));

    // Fetch data from backend services (best-effort)
    const [billing, platforms, tickets] = await Promise.all([
      fetch(`${BILLING_URL}/billing/${encodeURIComponent(orgId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${PLATFORM_URL}/platforms/${encodeURIComponent(orgId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${SUPPORT_URL}/admin/support/tickets?orgId=${encodeURIComponent(orgId)}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    ]);

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        imageUrl: org.imageUrl,
        membersCount: org.membersCount ?? members.length,
        createdAt: org.createdAt,
      },
      members,
      billing,
      platforms,
      tickets,
    });
  } catch (err) {
    console.error('Failed to fetch org detail:', err);
    return NextResponse.json({ error: 'Failed to fetch organization details' }, { status: 500 });
  }
}

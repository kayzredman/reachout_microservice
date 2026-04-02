import { NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';

async function requireSystemAdmin() {
  const user = await currentUser();
  if (!user || (user.publicMetadata as Record<string, unknown>)?.systemAdmin !== true) {
    return null;
  }
  return user;
}

export async function GET() {
  const admin = await requireSystemAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const client = await clerkClient();
    const orgsResponse = await client.organizations.getOrganizationList({
      limit: 100,
      includeMembersCount: true,
    });

    const orgs = orgsResponse.data.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      imageUrl: org.imageUrl,
      membersCount: org.membersCount ?? 0,
      createdAt: org.createdAt,
    }));

    return NextResponse.json({ organizations: orgs });
  } catch (err) {
    console.error('Failed to list organizations:', err);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let apiKey = await prisma.apiKey.findFirst({
      where: { userId: session.user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });

    // If key does not exist or was stored as a legacy unrecoverable hash, provision a real usable key
    if (!apiKey || !apiKey.key.startsWith("snt_live_")) {
      const { rawKey, prefix } = generateApiKey();
      if (apiKey) {
        apiKey = await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: {
            key: rawKey,
            prefix,
          },
        });
      } else {
        apiKey = await prisma.apiKey.create({
          data: {
            key: rawKey,
            prefix,
            userId: session.user.id,
            label: "Default API Key",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        key: apiKey.key,
        prefix: apiKey.prefix,
        label: apiKey.label,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("[API Key Fetch Error]:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rawKey, prefix } = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        key: rawKey,
        prefix,
        userId: session.user.id,
        label: "Regenerated API Key",
      },
    });

    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        key: apiKey.key,
        prefix: apiKey.prefix,
        label: apiKey.label,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

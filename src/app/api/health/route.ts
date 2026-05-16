import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import packageJson from "../../../../package.json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      version: process.env.KOCHBUCH_VERSION ?? packageJson.version,
      time: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", error: e instanceof Error ? e.message : String(e) },
      { status: 503 },
    );
  }
}

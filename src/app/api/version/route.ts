import { NextResponse } from "next/server";
import { getVersionStatus } from "@/lib/version/check";

export async function GET() {
  const status = await getVersionStatus();
  return NextResponse.json(status);
}

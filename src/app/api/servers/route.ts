import { NextResponse } from "next/server";
import { getPublicServers } from "@/lib/servers";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ servers: getPublicServers() });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import type { Space, Floor } from "@/lib/types/helpers";

export async function GET(request: NextRequest) {
  const buildingId = request.nextUrl.searchParams.get("buildingId");
  if (!buildingId) {
    return NextResponse.json({ error: "Missing buildingId" }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get floors
  const { data: floorsData } = await supabase
    .from("floors")
    .select("*")
    .eq("building_id", buildingId)
    .order("display_order");

  const floors = (floorsData ?? []) as unknown as Floor[];
  const floorMap = Object.fromEntries(floors.map((f) => [f.id, f.name]));

  // Get spaces
  const { data: spacesData } = await supabase
    .from("spaces")
    .select("*")
    .in(
      "floor_id",
      floors.map((f) => f.id)
    )
    .is("deleted_at", null)
    .order("name");

  const spaces = (spacesData ?? []) as unknown as Space[];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Generate QR data URLs for each space
  const qrCodes = await Promise.all(
    spaces.map(async (space) => {
      const url = `${appUrl}/inspect/${space.id}`;
      const dataUrl = await QRCode.toDataURL(url, {
        margin: 1,
        width: 200,
        color: { dark: "#111827", light: "#FFFFFF" },
      });
      return {
        spaceId: space.id,
        spaceName: space.name,
        floorName: floorMap[space.floor_id] || "",
        dataUrl,
      };
    })
  );

  return NextResponse.json({ qrCodes });
}

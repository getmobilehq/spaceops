import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { globalSearchSchema } from "@/lib/validators/schemas";
import type { Building, Space, Task, Deficiency, ChecklistTemplate } from "@/lib/types/helpers";

interface SearchResult {
  type: "building" | "space" | "task" | "deficiency" | "checklist";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = globalSearchSchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    type: url.searchParams.get("type") ?? "all",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { q, type } = parsed.data;
  const limit = type === "all" ? 5 : 20;
  const ilike = `%${q}%`;

  const results: SearchResult[] = [];

  const searches: Promise<void>[] = [];

  // Buildings search
  if (type === "all" || type === "buildings") {
    searches.push(
      (async () => {
        const { data } = await supabase
          .from("buildings")
          .select("id, name, street, city")
          .or(`name.ilike.${ilike},street.ilike.${ilike},city.ilike.${ilike}`)
          .eq("archived", false)
          .limit(limit);

        const buildings = (data ?? []) as unknown as Pick<Building, "id" | "name" | "street" | "city">[];
        buildings.forEach((b) => {
          const parts = [b.street, b.city].filter(Boolean);
          results.push({
            type: "building",
            id: b.id,
            title: b.name,
            subtitle: parts.join(", ") || "Building",
            url: `/buildings/${b.id}`,
          });
        });
      })()
    );
  }

  // Spaces search
  if (type === "all" || type === "spaces") {
    searches.push(
      (async () => {
        const { data } = await supabase
          .from("spaces")
          .select("id, name, floor_id, floors!inner(building_id, name, buildings!inner(name))")
          .ilike("name", ilike)
          .is("deleted_at", null)
          .limit(limit);

        const spaces = (data ?? []) as unknown as {
          id: string;
          name: string;
          floor_id: string;
          floors: { building_id: string; name: string; buildings: { name: string } };
        }[];
        spaces.forEach((s) => {
          results.push({
            type: "space",
            id: s.id,
            title: s.name,
            subtitle: `${s.floors.buildings.name} - ${s.floors.name}`,
            url: `/inspect/${s.id}`,
          });
        });
      })()
    );
  }

  // Tasks search
  if (type === "all" || type === "tasks") {
    searches.push(
      (async () => {
        const { data } = await supabase
          .from("tasks")
          .select("id, description, status, priority, spaces!inner(name, floors!inner(buildings!inner(name)))")
          .ilike("description", ilike)
          .limit(limit);

        const tasks = (data ?? []) as unknown as {
          id: string;
          description: string;
          status: string;
          priority: string;
          spaces: { name: string; floors: { buildings: { name: string } } };
        }[];
        tasks.forEach((t) => {
          results.push({
            type: "task",
            id: t.id,
            title: t.description.length > 60 ? t.description.slice(0, 60) + "..." : t.description,
            subtitle: `${t.spaces.floors.buildings.name} - ${t.spaces.name} (${t.status})`,
            url: `/tasks`,
          });
        });
      })()
    );
  }

  // Deficiencies search
  if (type === "all" || type === "deficiencies") {
    searches.push(
      (async () => {
        const { data } = await supabase
          .from("deficiencies")
          .select("id, deficiency_number, status, spaces!inner(name, floors!inner(buildings!inner(name)))")
          .or(`deficiency_number.ilike.${ilike},resolution_comment.ilike.${ilike}`)
          .limit(limit);

        const defs = (data ?? []) as unknown as {
          id: string;
          deficiency_number: string;
          status: string;
          spaces: { name: string; floors: { buildings: { name: string } } };
        }[];
        defs.forEach((d) => {
          results.push({
            type: "deficiency",
            id: d.id,
            title: d.deficiency_number,
            subtitle: `${d.spaces.floors.buildings.name} - ${d.spaces.name} (${d.status})`,
            url: `/deficiencies`,
          });
        });
      })()
    );
  }

  // Checklists search
  if (type === "all" || type === "checklists") {
    searches.push(
      (async () => {
        const { data } = await supabase
          .from("checklist_templates")
          .select("id, name, version, is_canned")
          .ilike("name", ilike)
          .eq("archived", false)
          .limit(limit);

        const templates = (data ?? []) as unknown as Pick<
          ChecklistTemplate,
          "id" | "name" | "version" | "is_canned"
        >[];
        templates.forEach((t) => {
          results.push({
            type: "checklist",
            id: t.id,
            title: t.name,
            subtitle: `v${t.version}${t.is_canned ? " (System)" : ""}`,
            url: `/admin/checklists/${t.id}`,
          });
        });
      })()
    );
  }

  await Promise.all(searches);

  return NextResponse.json({ results });
}

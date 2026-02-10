"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface RealtimeRefreshProps {
  buildingId: string;
  spaceIds: string[];
}

export function RealtimeRefresh({ buildingId, spaceIds }: RealtimeRefreshProps) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spaceIdSetRef = useRef(new Set(spaceIds));

  useEffect(() => {
    spaceIdSetRef.current = new Set(spaceIds);
  }, [spaceIds]);

  useEffect(() => {
    if (spaceIds.length === 0) return;

    const supabase = createBrowserSupabaseClient();

    function scheduleRefresh() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        router.refresh();
      }, 2000);
    }

    function isRelevantSpace(payload: { new?: Record<string, unknown> }) {
      const spaceId = payload.new?.space_id as string | undefined;
      return spaceId ? spaceIdSetRef.current.has(spaceId) : false;
    }

    const channel = supabase
      .channel(`map:${buildingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inspections" },
        (payload) => {
          if (isRelevantSpace(payload)) scheduleRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deficiencies" },
        (payload) => {
          if (isRelevantSpace(payload)) scheduleRefresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (isRelevantSpace(payload)) scheduleRefresh();
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [buildingId, spaceIds, router]);

  return null;
}

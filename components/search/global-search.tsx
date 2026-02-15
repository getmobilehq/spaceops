"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Building2,
  MapPin,
  ClipboardList,
  AlertTriangle,
  CheckSquare,
  Loader2,
  ArrowRight,
  Clock,
  X,
} from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface SearchResult {
  type: "building" | "space" | "task" | "deficiency" | "checklist";
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons: Record<SearchResult["type"], React.ElementType> = {
  building: Building2,
  space: MapPin,
  task: ClipboardList,
  deficiency: AlertTriangle,
  checklist: CheckSquare,
};

const typeLabels: Record<SearchResult["type"], string> = {
  building: "Buildings",
  space: "Spaces",
  task: "Tasks",
  deficiency: "Deficiencies",
  checklist: "Checklists",
};

const STORAGE_KEY = "spaceops:recent-searches";

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  try {
    const recent = getRecentSearches().filter((q) => q !== query);
    recent.unshift(query);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent.slice(0, 5)));
  } catch {
    // Ignore localStorage errors
  }
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load recent searches when dialog opens
  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      // Focus after dialog animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=all`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const navigate = (result: SearchResult) => {
    saveRecentSearch(query);
    onOpenChange(false);
    router.push(result.url);
  };

  const handleRecentClick = (q: string) => {
    setQuery(q);
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  // Flat list for keyboard navigation
  const flatResults = Object.values(grouped).flat();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && flatResults[selectedIndex]) {
      e.preventDefault();
      navigate(flatResults[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Search</DialogTitle>
        </VisuallyHidden>

        {/* Search input */}
        <div className="flex items-center border-b border-slate-200 px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search buildings, spaces, tasks..."
            className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
          {query && !loading && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 rounded p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {/* Recent searches (when no query) */}
          {!query && recentSearches.length > 0 && (
            <div className="p-2">
              <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                Recent
              </p>
              {recentSearches.map((q) => (
                <button
                  key={q}
                  onClick={() => handleRecentClick(q)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-slate-100"
                >
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {/* Grouped results */}
          {Object.entries(grouped).map(([type, items]) => {
            const Icon = typeIcons[type as SearchResult["type"]];
            const label = typeLabels[type as SearchResult["type"]];

            return (
              <div key={type} className="p-2">
                <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wider text-slate-400">
                  {label}
                </p>
                {items.map((result) => {
                  const globalIndex = flatResults.indexOf(result);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={result.id}
                      onClick={() => navigate(result)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm ${
                        isSelected
                          ? "bg-primary-50 text-primary-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary-500" : "text-slate-400"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{result.title}</p>
                        <p className="truncate text-xs text-slate-500">{result.subtitle}</p>
                      </div>
                      <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-primary-400" : "text-slate-300"}`} />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">
              &uarr;&darr;
            </kbd>
            <span>Navigate</span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>
            <span>Open</span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>
            <span>Close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

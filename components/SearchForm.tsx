"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";

export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(defaultValue || (searchParams.get("q") ?? ""));

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement)?.value?.trim();
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
      }
    },
    [router]
  );

  return (
    <form onSubmit={handleSubmit} className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        name="q"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects, tasks..."
        className="pl-9"
      />
    </form>
  );
}

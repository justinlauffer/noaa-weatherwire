"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function useFeedPagination() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const setPage = useCallback(
    (nextPage: number | ((current: number) => number)) => {
      const resolved = typeof nextPage === "function" ? nextPage(page) : nextPage;
      const params = new URLSearchParams(searchParams.toString());
      if (resolved <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(resolved));
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [page, pathname, router, searchParams],
  );

  return { page, setPage };
}

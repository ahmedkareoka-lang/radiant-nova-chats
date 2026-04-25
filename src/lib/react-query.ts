import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * 🚀 Centralized React Query factory.
 *
 * World-class defaults tuned for a real-time social app:
 * - Aggressive staleTime to avoid wasteful refetches
 * - Long gcTime so back-navigation feels instant
 * - No retry on auth errors (401/403) — they won't fix themselves
 * - Single retry with exponential backoff for transient failures
 * - Mutation errors surface as toasts, except auth flows which own their UX
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 2 * 60_000, // 2 min fresh
        gcTime: 10 * 60_000, // keep 10 min in memory
        refetchOnWindowFocus: false,
        refetchOnReconnect: "always",
        refetchOnMount: false,
        retry: (failureCount, error: any) => {
          const status = error?.status ?? error?.statusCode;
          if (status === 401 || status === 403) return false;
          return failureCount < 1;
        },
        retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
        networkMode: "online",
      },
      mutations: {
        retry: 0,
        networkMode: "online",
        onError: (error: any) => {
          if (import.meta.env.DEV) console.error("❌ Mutation error:", error);
          const status = error?.status ?? error?.statusCode;
          if (status === 401 || status === 403) return;
          const msg = error?.message || error?.error_description;
          if (msg) toast.error(msg);
        },
      },
    },
  });

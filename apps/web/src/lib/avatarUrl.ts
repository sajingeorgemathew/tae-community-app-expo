import { useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

/**
 * Per-page signed URL cache for profile avatars.
 * Uses useRef(new Map()) so the cache lives for the page session only,
 * avoiding SSR leaks and cross-user contamination.
 */
export function useAvatarUrls() {
  const cache = useRef(new Map<string, string>());

  const getAvatarUrl = useCallback(async (avatarPath: string): Promise<string | null> => {
    const cached = cache.current.get(avatarPath);
    if (cached) return cached;

    const { data } = await supabase.storage
      .from("profile-avatars")
      .createSignedUrl(avatarPath, 3600);

    if (data?.signedUrl) {
      cache.current.set(avatarPath, data.signedUrl);
      return data.signedUrl;
    }
    return null;
  }, []);

  const resolveAvatarUrls = useCallback(
    async (profiles: { id: string; avatar_path: string | null }[]): Promise<Record<string, string>> => {
      const urls: Record<string, string> = {};
      const toFetch: { id: string; path: string }[] = [];

      for (const p of profiles) {
        if (!p.avatar_path) continue;
        const cached = cache.current.get(p.avatar_path);
        if (cached) {
          urls[p.id] = cached;
        } else {
          toFetch.push({ id: p.id, path: p.avatar_path });
        }
      }

      if (toFetch.length > 0) {
        const results = await Promise.all(
          toFetch.map(async ({ id, path }) => {
            const { data } = await supabase.storage
              .from("profile-avatars")
              .createSignedUrl(path, 3600);
            const url = data?.signedUrl ?? null;
            if (url) cache.current.set(path, url);
            return { id, url };
          })
        );
        for (const r of results) {
          if (r.url) urls[r.id] = r.url;
        }
      }

      return urls;
    },
    []
  );

  return { getAvatarUrl, resolveAvatarUrls };
}

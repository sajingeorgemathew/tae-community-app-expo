import { useCallback, useEffect, useRef, useState } from "react";
import type { Profile } from "@tae/shared";
import {
  buildAvatarPath,
  createSignedUrl,
  extractExtension,
  STORAGE_BUCKETS,
  uploadFile,
} from "@tae/shared";
import { supabase } from "../lib/supabase";
import { useAuth } from "./auth";

interface ProfileState {
  profile: Profile | null;
  avatarUrl: string | null;
  loading: boolean;
  error: string | null;
}

export function useMyProfile() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<ProfileState>({
    profile: null,
    avatarUrl: null,
    loading: true,
    error: null,
  });

  // Track the avatar_path we already resolved so we only regenerate when it changes.
  const resolvedAvatarPath = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setState({ profile: null, avatarUrl: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      setState({
        profile: null,
        avatarUrl: null,
        loading: false,
        error: error?.message ?? "Profile not found",
      });
      resolvedAvatarPath.current = null;
      return;
    }

    const profile = data as Profile;

    // Resolve avatar signed URL only when avatar_path changes.
    let avatarUrl = state.avatarUrl;
    if (profile.avatar_path !== resolvedAvatarPath.current) {
      avatarUrl = null;
      if (profile.avatar_path) {
        const result = await createSignedUrl(
          supabase,
          STORAGE_BUCKETS.PROFILE_AVATARS,
          profile.avatar_path,
        );
        avatarUrl = result.signedUrl;
      }
      resolvedAvatarPath.current = profile.avatar_path;
    }

    setState({ profile, avatarUrl, loading: false, error: null });
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const uploadAvatar = useCallback(
    async (fileUri: string, fileName: string, mimeType: string) => {
      if (!userId) throw new Error("Not signed in");

      const ext = extractExtension(fileName);
      const storagePath = buildAvatarPath({ userId, ext });

      // Read file as ArrayBuffer (same pattern as message attachments)
      const FileSystem = await import("expo-file-system/legacy");
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: "base64" as const,
      });
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const body = bytes.buffer as ArrayBuffer;

      const result = await uploadFile(supabase, {
        path: storagePath,
        bucket: STORAGE_BUCKETS.PROFILE_AVATARS,
        contentType: mimeType,
        body,
        upsert: true,
      });
      if (result.error) throw new Error(result.error);

      // Update profile row with new avatar_path
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_path: storagePath })
        .eq("id", userId);
      if (updateError) throw new Error(updateError.message);

      // Force signed URL refresh by clearing the resolved ref
      resolvedAvatarPath.current = null;
      await fetchProfile();
    },
    [userId, fetchProfile],
  );

  return { ...state, refresh: fetchProfile, uploadAvatar };
}

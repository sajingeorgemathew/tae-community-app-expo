"use client";

import { usePresenceHeartbeat } from "@/src/lib/usePresenceHeartbeat";

export default function PresenceProvider() {
  usePresenceHeartbeat();
  return null;
}

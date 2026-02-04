"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function MessagesContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("c");

  return (
    <>
      {conversationId ? (
        <div className="border rounded p-4">
          <p className="text-gray-600">Conversation: {conversationId}</p>
        </div>
      ) : (
        <p className="text-gray-500">No conversation selected</p>
      )}
    </>
  );
}

export default function MessagesPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mb-6">
        <Link href="/app" className="text-blue-600 hover:underline text-sm">
          &larr; Back to App
        </Link>
      </div>

      <h1 className="text-2xl font-semibold mb-6">Messages</h1>

      <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
        <MessagesContent />
      </Suspense>
    </main>
  );
}

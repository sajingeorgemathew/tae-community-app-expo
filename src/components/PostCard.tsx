import Link from "next/link";

export interface Attachment {
  id: string;
  type: "image" | "video" | "link";
  signedUrl?: string;
  linkUrl?: string;
}

export const EMOJI_SET = ["❤️", "👍", "😂"] as const;
export type Emoji = (typeof EMOJI_SET)[number];

export interface ReactionCounts {
  [emoji: string]: number;
}

export interface PostCardProps {
  content: string;
  audience: string;
  authorName?: string;
  authorId?: string;
  createdAt: string;
  attachments: Attachment[];
  canDelete?: boolean;
  onDelete?: () => void;
  reactionCounts?: ReactionCounts;
  userReactions?: Emoji[];
  onReactionToggle?: (emoji: Emoji) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PostCard({
  content,
  audience,
  authorName,
  authorId,
  createdAt,
  attachments,
  canDelete,
  onDelete,
  reactionCounts = {},
  userReactions = [],
  onReactionToggle,
}: PostCardProps) {
  return (
    <div className="border rounded p-4">
      <div className="flex items-center justify-between mb-2">
        {authorName && (
          authorId ? (
            <Link href={`/app/profile/${authorId}`} className="font-medium text-blue-600 hover:underline">
              {authorName}
            </Link>
          ) : (
            <p className="font-medium">{authorName}</p>
          )
        )}
        <div className={`flex items-center gap-2 ${authorName ? "" : "ml-auto"}`}>
          {audience !== "all" && (
            <span className="text-xs bg-gray-200 px-2 py-1 rounded capitalize">
              {audience}
            </span>
          )}
          <span className="text-xs text-gray-500">{formatDate(createdAt)}</span>
        </div>
      </div>
      <p className="text-gray-700 whitespace-pre-wrap">{content}</p>
      {attachments.length > 0 && (
        <div className="mt-3 space-y-2">
          {attachments.map((att) => {
            if (att.type === "image" && att.signedUrl) {
              return (
                <img
                  key={att.id}
                  src={att.signedUrl}
                  alt="Attachment"
                  className="max-w-xs rounded"
                />
              );
            }
            if (att.type === "video" && att.signedUrl) {
              return (
                <video
                  key={att.id}
                  src={att.signedUrl}
                  controls
                  className="max-w-md rounded"
                />
              );
            }
            if (att.type === "link" && att.linkUrl) {
              return (
                <a
                  key={att.id}
                  href={att.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline block"
                >
                  {att.linkUrl}
                </a>
              );
            }
            return null;
          })}
        </div>
      )}
      {onReactionToggle && (
        <div className="mt-3 pt-3 border-t flex gap-2">
          {EMOJI_SET.map((emoji) => {
            const count = reactionCounts[emoji] ?? 0;
            const isActive = userReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => onReactionToggle(emoji)}
                className={`px-2 py-1 rounded text-sm flex items-center gap-1 ${
                  isActive
                    ? "bg-blue-100 border border-blue-300"
                    : "bg-gray-100 hover:bg-gray-200 border border-transparent"
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="text-gray-600">{count}</span>}
              </button>
            );
          })}
        </div>
      )}
      {canDelete && onDelete && (
        <div className="mt-3 pt-3 border-t">
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

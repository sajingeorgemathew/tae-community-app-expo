interface AvatarProps {
  fullName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-20 h-20 text-2xl",
} as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  fullName,
  avatarUrl,
  size = "md",
  className = "",
}: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shrink-0 ${className}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span className="text-gray-500 font-medium">{getInitials(fullName)}</span>
      )}
    </div>
  );
}

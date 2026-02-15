import PresenceProvider from "@/src/components/PresenceProvider";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <PresenceProvider />
      {children}
    </div>
  );
}

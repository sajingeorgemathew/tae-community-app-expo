import PresenceProvider from "@/src/components/PresenceProvider";
import AppSidebar from "@/src/components/AppSidebar";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell min-h-screen flex flex-col md:flex-row bg-gray-50">
      <PresenceProvider />
      <AppSidebar />
      <main className="flex-1 min-w-0 w-full max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}

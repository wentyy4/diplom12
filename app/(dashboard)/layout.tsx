import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { auth } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userRole = (session?.user?.role as string | undefined) ?? null;

  return (
    <div className="min-h-screen">
      <Sidebar userRole={userRole} />
      <div className="pl-14 lg:pl-64">
        <Navbar />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

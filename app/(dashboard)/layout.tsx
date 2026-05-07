import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-14 lg:pl-64">
        <Navbar />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

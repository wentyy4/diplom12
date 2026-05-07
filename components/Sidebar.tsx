"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  LogOut,
  Menu,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/profile", label: "Profile", icon: User },
];

function NavLinks({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav className={cn("space-y-1", className)}>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link key={item.href} href={item.href} onClick={onClick}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2",
                isActive && "bg-primary/10 text-primary font-medium"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 pt-12">
            <SheetHeader>
              <SheetTitle>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 font-semibold"
                >
                  <FolderKanban className="h-8 w-8 text-primary" />
                  IT Projects
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-6">
              <NavLinks onClick={() => setOpen(false)} />
              <form action={logout} className="mt-auto pt-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground"
                  type="submit"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card flex-col">
        <div className="p-6 border-b">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <FolderKanban className="h-8 w-8 text-primary" />
            <span>IT Projects</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="p-4 border-t">
          <form action={logout}>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-muted-foreground"
              type="submit"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </form>
        </div>
      </aside>
    </>
  );
}

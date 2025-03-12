"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/lib/supabase/provider";
import { useState, useEffect } from "react";

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { supabase } = useSupabase();
  const [loading, setLoading] = useState<string | null>(null);

  // Clear loading state when pathname changes (navigation completes)
  useEffect(() => {
    setLoading(null);
  }, [pathname]);

  const handleSignOut = async () => {
    setLoading("signout");
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      setLoading(href);
      router.push(href);
    }
  };

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Quizzes",
      href: "/quizzes",
      icon: BookOpen,
    },
    {
      title: "Content",
      href: "/content",
      icon: FileText,
    },
    {
      title: "Progress",
      href: "/progress",
      icon: LineChart,
    },
  ];

  return (
    <nav className="grid items-start gap-2 py-6">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Button
            key={item.href}
            variant={isActive ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => handleNavigation(item.href)}
            disabled={loading === item.href}
          >
            {loading === item.href ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <item.icon className="mr-2 h-4 w-4" />
            )}
            {item.title}
          </Button>
        );
      })}
      <Button
        variant="ghost"
        className="w-full justify-start mt-auto"
        onClick={handleSignOut}
        disabled={loading === "signout"}
      >
        {loading === "signout" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="mr-2 h-4 w-4" />
        )}
        Sign out
      </Button>
    </nav>
  );
}

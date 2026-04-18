"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, User, Users, Apple, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCoachHomeHref } from "@/components/shared/coach-home-context";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const BASE_ITEMS: NavItem[] = [
  { href: "/today", label: "Aujourd'hui", icon: Home },
  { href: "/foods", label: "Aliments", icon: Apple },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav({
  isCoach,
  isAdmin,
}: {
  isCoach?: boolean;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const coachHomeHref = useCoachHomeHref();
  // Insertions additives avant l'onglet "Profil" :
  //   - user          : [Today, Aliments, Stats, Profil]        (4)
  //   - coach         : + Coach                                  (5)
  //   - admin         : + Coach + Admin                          (6) — trop.
  //     On garde 5 max : admin remplace "Coach" par "Admin" (l'admin peut
  //     accéder aux pages coach via /admin de toute façon).
  let items: NavItem[];
  const coachHomeItem = {
    href: coachHomeHref ?? "/today",
    label: coachHomeHref ? "Accueil" : "Mes données",
    icon: Home,
  };

  if (isAdmin) {
    items = [
      { href: "/coach", label: "Clientes", icon: Users },
      coachHomeItem,
      { href: "/admin", label: "Admin", icon: ShieldCheck },
      { href: "/stats", label: "Stats", icon: BarChart3 },
      { href: "/profile", label: "Profil", icon: User },
    ];
  } else if (isCoach) {
    items = [
      { href: "/coach", label: "Clientes", icon: Users },
      coachHomeItem,
      { href: "/foods", label: "Aliments", icon: Apple },
      { href: "/stats", label: "Stats", icon: BarChart3 },
      { href: "/profile", label: "Profil", icon: User },
    ];
  } else {
    items = BASE_ITEMS;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur-lg safe-bottom">
      <ul
        className={cn(
          "mx-auto grid max-w-lg px-2 py-2",
          items.length === 5 ? "grid-cols-5" : "grid-cols-4",
        )}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs transition",
                  active
                    ? "text-[var(--color-primary-soft)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-text)]",
                )}>
                <Icon className="size-5" />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

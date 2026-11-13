import { Link } from "@tanstack/react-router";
import { Home, Coins, Users, Wallet, UserRound } from "lucide-react";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/earn", label: "Earn", icon: Coins },
  { to: "/team", label: "Team", icon: Users },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/me", label: "Me", icon: UserRound },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl safe-bottom">
      <ul className="mx-auto grid max-w-3xl grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="group flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors data-[status=active]:text-gold"
            >
              <span className="grid h-8 w-12 place-items-center rounded-full transition-colors group-data-[status=active]:bg-gold/15">
                <Icon className="h-5 w-5" />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

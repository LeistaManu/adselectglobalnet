import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/app/BottomNav";

export const Route = createFileRoute("/_authenticated/_tabs")({
  component: TabsLayout,
});

function TabsLayout() {
  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto w-full max-w-3xl px-4 pt-5 sm:px-6">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}

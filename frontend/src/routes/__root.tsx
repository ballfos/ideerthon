import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { type AuthContext } from "@/features/auth";

export const Route = createRootRouteWithContext<AuthContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <Outlet />
    </>
  );
}

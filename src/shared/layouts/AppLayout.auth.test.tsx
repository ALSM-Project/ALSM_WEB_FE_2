import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";

const mocks = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock("@/features/auth/api/auth.api", () => ({
  authApi: { logout: mocks.logout },
}));
vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: () => ({ user: { fullName: "Disposable fixture" } }),
}));
vi.mock("@/hooks/useNavigation", () => ({ useNavigation: () => ({}) }));
vi.mock("@/shared/navigation/Breadcrumb", () => ({ Breadcrumb: () => null }));
vi.mock("@/components/Sidebar/Sidebar", () => ({
  Sidebar: ({ onLogout }: { onLogout: () => void }) => (
    <button onClick={onLogout}>Fixture sign out</button>
  ),
}));

describe("truthful staff logout", () => {
  it("shows an unconfirmed-revocation error and keeps the page available for retry", async () => {
    const alert = vi.spyOn(window, "alert").mockImplementation(() => {});
    const before = window.location.href;
    mocks.logout.mockRejectedValueOnce(new Error("503"));
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Fixture sign out" }));
    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        "Sign out could not be confirmed. Please try Sign Out again.",
      ),
    );
    expect(window.location.href).toBe(before);
    expect(
      screen.getByRole("button", { name: "Fixture sign out" }),
    ).toBeInTheDocument();
    alert.mockRestore();
  });
});

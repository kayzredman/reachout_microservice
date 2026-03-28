import { render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";
import { ClerkProvider, useUser } from "@clerk/nextjs";
import React from "react";

jest.mock("@clerk/nextjs", () => {
  const actual = jest.requireActual("@clerk/nextjs");
  return {
    ...actual,
    useUser: jest.fn(),
  };
});

describe("Sidebar", () => {
  beforeEach(() => {
    (useUser as jest.Mock).mockReturnValue({
      isSignedIn: true,
      user: {
        imageUrl: "https://example.com/avatar.png",
        fullName: "Test User",
        username: "testuser",
        publicMetadata: { role: "Admin" },
      },
    });
  });

  it("renders navigation links", () => {
    render(
      <ClerkProvider>
        <Sidebar />
      </ClerkProvider>
    );
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Publisher")).toBeInTheDocument();
    expect(screen.getByText("Scheduler")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Planner")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders user avatar and name", () => {
    render(
      <ClerkProvider>
        <Sidebar />
      </ClerkProvider>
    );
    expect(screen.getByAltText("User avatar")).toHaveAttribute(
      "src",
      "https://example.com/avatar.png"
    );
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});

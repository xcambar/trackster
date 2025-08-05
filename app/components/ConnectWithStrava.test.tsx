import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import ConnectWithStrava from "./ConnectWithStrava";

describe("it should allow the user to sign in", () => {
  it("renders a clickable button with the correct text", async () => {
    render(<ConnectWithStrava />);
    const button = screen.getByRole("link", { name: /connect with strava/i });
    expect(button).toHaveAttribute("href", "/login/strava");
  });
});

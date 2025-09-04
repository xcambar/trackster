import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import LoginWithEmail from "./LoginWithEmail";

describe("LoginWithEmail", () => {
  it("renders email input, password input and submit button", () => {
    render(<LoginWithEmail />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("[TEMP] has all the fields disabled", () => {
    render(<LoginWithEmail />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const checkbox = screen.getByRole("checkbox", { name: /remember me/i });
    const submitButton = screen.getByRole("button", { name: /sign in/i });
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(checkbox).toBeDisabled();
    expect(submitButton).toBeDisabled();
  });

  it.skip("calls onSubmit with email when form is submitted", () => {
    const handleSubmit = jest.fn();
    render(<LoginWithEmail onSubmit={handleSubmit} />);
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
    expect(handleSubmit).toHaveBeenCalledWith("test@example.com");
  });
});

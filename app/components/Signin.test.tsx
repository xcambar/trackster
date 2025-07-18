import Signin from "./Signin";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

describe("it should always display the Email login form optionally", () => {
  it("does not render the form when the feature is disabled", async () => {
    render(<Signin enableEmail={false} />);
    const form = screen.queryByTestId("email-login-form");
    expect(form).not.toBeInTheDocument();
  });

  it("does render the form when the feature is enabled", async () => {
    render(<Signin enableEmail={true} />);
    const form = screen.queryByTestId("email-login-form");
    expect(form).toBeInTheDocument();
  });

  it("renders the sign up link when the email login form is present", async () => {
    render(<Signin enableEmail={true} />);
    const signUpLink = screen.getByTestId("sign-up-link");
    expect(signUpLink).toBeInTheDocument();
  });
});

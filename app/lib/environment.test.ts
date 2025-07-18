import { getEnvironment } from "../lib/environment";

describe("Loading environment variables securely", () => {
  it("should throw an error if the environment variable is not set", () => {
    //@ts-expect-error We're intentionally testing a missing variable
    expect(() => getEnvironment("NON_EXISTENT_VARIABLE")).toThrow(
      "Environment variable NON_EXISTENT_VARIABLE is not set"
    );
  });

  it("should return the value of an existing environment variable", () => {
    process.env.TEST_VARIABLE = "test_value";
    //@ts-expect-error  This will not throw an error because the variable is set above
    //                  This situation should never occur in production
    expect(getEnvironment("TEST_VARIABLE")).toBe("test_value");
    delete process.env.TEST_VARIABLE; // Clean up
  });
});

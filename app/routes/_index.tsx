import type { MetaFunction } from "@remix-run/node";
import Button from "@mui/material/Button";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
return (
  <div>
    <h1>Welcome to Remix!</h1>
    <p>This is the index page of your Remix application.</p>
  <Button variant="contained">Hello world</Button>
  </div>

)
}

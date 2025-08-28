import { getEnvironment } from "npm:@xcambar/trackster-env";

export default (_req: Request) => {
  return new Response(`hello ${getEnvironment("SUPABASE_DB_URL")}`, {
    status: 200,
  });
};

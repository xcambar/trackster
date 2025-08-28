import "dotenv/config";

import { populateGAPLookup } from "@xcambar/trackster-db/populateGAPLookup";
import db from "../app/services/db.server";

await populateGAPLookup();
await db.$client.end();

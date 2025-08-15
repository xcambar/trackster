import "dotenv/config";

import { populateGAPLookup } from "db/populateGAPLookup";
import db from "../app/services/db.server";

await populateGAPLookup();
await db.$client.end();

import "dotenv/config";

import { populateGAPLookup } from "../populateGAPLookup";
import db from "../client";

await populateGAPLookup();
await db.$client.end();

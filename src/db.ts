import { drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema.ts";

export { schema };

export const db = drizzle(process.env.DATABASE_URL!);

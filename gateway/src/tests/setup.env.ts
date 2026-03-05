process.env.NODE_ENV = "test";

import dotenv from "dotenv";
dotenv.config({ path: ".env.test", override: true, quiet: true });
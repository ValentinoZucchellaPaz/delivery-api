import app from "./app.js";
import { testConnection } from "./config/db.js";

const PORT = process.env.PORT || 3000;

// check db connection
testConnection();

const server = app.listen(PORT, () =>
  console.log(`Server running on port http://localhost${PORT}`)
);

export default server;

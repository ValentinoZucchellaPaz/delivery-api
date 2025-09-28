import app from "./app.js";
import { testConnection } from "./config/db.js";

const PORT = process.env.PORT || 3000;

// check db connection
testConnection();

app.listen(PORT, () => console.log(`Server running on port http://localhost${PORT}`));

import app from './app.js'

const PORT = process.env.PORT || 3000;

// check db connection
testConnection();

app.listen(PORT, () => console.log(`Server running on port http://localhost${PORT}`));

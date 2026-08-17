const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express backend!' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
const express = require("express");
const app = express();
const { StatusCodes } = require("http-status-codes");
const { generatedError } = require("./middlewares");
const cors = require("cors");



// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for HTTP routes
app.use(cors({
    origin: "http://localhost:5173", // More specific than5173
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic health check route
app.get('/aa', (req, res) => {
  res.json({ message: 'Aishura Chat Server Running', status: 'OK' });
});

app.use("/", require("./routes/virtualgf"));


// Error Handling middleware (must be after routes)
app.use(generatedError);



// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🌐 CORS enabled for: http://localhost:5173`);
});
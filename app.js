
require("dotenv").config();

const express = require("express");
const path = require("path");

const landingRouter = require("./routes/landing_route");
const landingAuthRouter = require("./routes/landingAuth_route");
const pageRouter = require("./routes/page_route")

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", landingRouter);
app.use("/api/protected", landingAuthRouter);
app.use("/cafemadan",pageRouter)

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Error Handler:", err);

    res.status(err.statusCode || 500).json({
        message: err.isOperational
            ? err.message
            : "Internal Server Error",

        code: err.code || "SERVER_ERR"
    });
});

// Server
// const PORT = process.env.APP_PORT || 3000;

//app.listen(PORT, () => {
  //  console.log(`Server running on port ${PORT}`);
//});

module.exports = app;

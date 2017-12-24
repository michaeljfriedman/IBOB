/*
 * server.js
 *
 * Configures and starts the server.
 */

const express = require("express");
const app = express();
const port = 3001;

const api = require("./routes/api");

/******************************************************************************/

// Configuration

// Store raw request body in req.body. Needed to access signatures on
// requests.
// Ref: https://stackoverflow.com/questions/9920208/expressjs-raw-body/9920700#9920700
app.use(function(req, res, next) {
    var data = "";
    req.setEncoding("utf8");

    // Concatenate request body into `data`
    req.on("data", function(chunk) {
        data += chunk;
    });

    // Store in req.body
    req.on("end", function() {
        req.body = data;
        next();
    });
});

// Map /api URLs to routes/api.js
app.use("/api", api.app);

/******************************************************************************/

// Start server
app.listen(port, function() {
    console.log("User-Server Directory is running on port " + port);
});
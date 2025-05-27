const express = require("express");
const { error } = require("../utils");

const apiRoutes = express.Router();

const analyzeRoutes = require("./analyze.route");

apiRoutes.use("/analyze", [analyzeRoutes]);

apiRoutes.use("*", () => error.throwNotFound({ item: "Route" }));

module.exports = apiRoutes;

const express = require("express");
const { analyzeController } = require("../controllers");

const analyzeRoutes = express.Router({});

analyzeRoutes.post("/statement", analyzeController.analyzeStatement);

module.exports = analyzeRoutes;

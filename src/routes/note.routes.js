const express = require("express");
const { noteController } = require("../controllers");

const noteRoutes = express.Router({});

noteRoutes.post("/", noteController.addOne);

module.exports = noteRoutes;

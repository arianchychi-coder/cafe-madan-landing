
const express = require("express");
const landingControler = require("../controlers/landing_controler");
const visitController = require("../controlers/visit_controller");

const router = express.Router();

router.get("/admin", landingControler.getAll);
router.post("/register", landingControler.addInfo);
router.get("/dashboard/stats", landingControler.getStats);

// Site Analytics
router.post("/analytics/visit", visitController.trackVisit);
router.get("/analytics/visits", visitController.getVisits);

module.exports = router;

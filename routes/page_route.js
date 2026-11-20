const express = require("express")
const pageController = require("../controlers/page_controller")
const router = express.Router()
router.get("/:name",pageController.getPage)
module.exports = router
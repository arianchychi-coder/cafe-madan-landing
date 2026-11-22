const express = require("express")
const authOrizationToken = require("../middelwares/landingAuth_middelware")
const router = express.Router()

router.get("/",authOrizationToken,(res,req)=>{
    res.json({message:"توکن پیدا شد ",user:req.user})
})

module.exports = router
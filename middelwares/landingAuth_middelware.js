const jwt = require("jsonwebtoken")
const secretKey = "12345"


const authOrizationToken = async(req,res,next)=>{
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.split(" ")[1]


    if (!token) {
        return res.status(401).json({message:"توکن پیدا نشد"})
    }


    try {
        const user = jwt.verify(token,secretKey)
        req.user = user
        next
    } catch (error) {
        console.log("Error: ",error)
        return res.status(403).json({message:"توکن شما غیر قابل قبول هست . لطفا دوباره ابتدا ثبت نام کنید"})
    }
}


module.exports = authOrizationToken
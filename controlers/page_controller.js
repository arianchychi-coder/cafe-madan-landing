const path = require("path")
const AppError = require("../errors/landing_error")
const frogs = [
    {name:"index",file:"index.html"},
    {name:"admin",file:"admin.html"}
]

const getPage = async(req,res)=>{
    const nameURL = decodeURIComponent(req.params.name)
    const frog = frogs.find(c=>c.name === nameURL)

    if (!frog) {
        throw new AppError("Page Not Found",404,"PAGE_NOT_FOUND")
    }


    res.sendFile(frog.file.trim(), {
        root: path.resolve(__dirname,"..","public")
    })
}


module.exports = {
    getPage
}

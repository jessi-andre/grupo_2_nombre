module.exports = (req,res,next) =>{
    if(req.cookies.lazloCookie){
        req.session.userLogin = req.cookies.lazloCookie
    }
    next()
} 
module.exports = (req, res, next) => {
    if (req.session.user.userType !== "vendor") {
        req.flash('error', 'Unauthorized: You must be a vendor.'); 
        return res.render("shop/index", {
            pageTitle: "Shop",
            path: "/",
            error:req.flash('error')[0]
          }); 
    }
    next();
}

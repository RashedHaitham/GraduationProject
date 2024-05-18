module.exports = (req, res, next) => {
    if (req.session.user.userType !== "customer") {
        req.flash('error', 'Unauthorized: You must be a customer.'); 
        return res.render("shop/index", {
            pageTitle: "Shop",
            path: "/",
            error:req.flash('error')[0]
          }); 
    }
    next();
}

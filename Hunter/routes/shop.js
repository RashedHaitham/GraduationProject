const path = require("path");

const express = require("express");

const shopController = require("../controllers/shop");
const isAuth = require("../middleware/is-auth");
const isCus = require("../middleware/is-customer");

const router = express.Router();

router.get("/", shopController.getIndex);

router.get("/products", shopController.getProducts);

router.get("/products/:productId", shopController.getProduct);

router.get("/user/profile/:userId",isAuth, shopController.getVendorProfile);

router.get("/filtered/products", shopController.getFilteredProducts);

router.get("/cart", isAuth, isCus, shopController.getCart);

router.post("/cart", isAuth, isCus, shopController.postCart);

router.get("/update-cart/:productId", isAuth, isCus, shopController.updateCart);

router.post(
  "/cart-delete-item",
  isAuth,
  isCus,
  shopController.postCartDeleteProduct
);

router.get("/checkout", isAuth, isCus, shopController.getCheckout);

router.get("/orders", isAuth, isCus, shopController.getOrders);

router.get("/orders/:orderId", isAuth, isCus, shopController.getInvoice);

router.get("/product/reviews/:productId", isAuth, shopController.getReviews);

router.post("/product/reviews", isAuth, shopController.postReviews);

router.post("/product-orders/chat", isAuth, shopController.chat);

module.exports = router;

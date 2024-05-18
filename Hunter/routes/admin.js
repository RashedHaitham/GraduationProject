const path = require("path");

const express = require("express");
const { body } = require("express-validator/check");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");
const isVendor = require("../middleware/is-vendor");

const router = express.Router();

router.get("/profile", isAuth, adminController.getProfile);
router.post("/profile", isAuth, adminController.postProfile);

// /admin/add-product => GET
router.get("/add-product", isAuth, isVendor, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuth, isVendor, adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 5, max: 400 }).trim(),
  ],
  isAuth,
  isVendor,
  adminController.postAddProduct
);

router.get(
  "/edit-product/:productId",
  isAuth,
  isVendor,
  adminController.getEditProduct
);

router.post(
  "/edit-product",
  [
    body("title").isString().isLength({ min: 3 }).trim(),
    body("price").isFloat(),
    body("description").isLength({ min: 5, max: 400 }).trim(),
  ],
  isAuth,
  isVendor,
  adminController.postEditProduct
);

router.delete(
  "/product/:productId",
  isAuth,
  isVendor,
  adminController.deleteProduct
);

router.get(
  "/product-orders",
  isAuth,
  isVendor,
  adminController.getProductOrders
);

router.get(
  "/product-orders/:customerId",
  isAuth,
  isVendor,
  adminController.getCustomerOrders
);

module.exports = router;

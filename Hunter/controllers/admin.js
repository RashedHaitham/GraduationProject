const fileHelper = require("../util/file");

const { validationResult } = require("express-validator/check");
const crypto = require("crypto");

const Product = require("../models/product");
const Order = require("../models/order");
const User = require("../models/user");

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
  });
};

exports.postAddProduct = async (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  const category = req.body.category;
  let categoryFields = {};

  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
        category: category,
      },
      errorMessage: "Attached file is not an image.",
      validationErrors: [],
    });
  }

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        category: category,
        description: description,
        ...req.body,
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  if (category === "Electronics") {
    categoryFields = {
      electronics: {
        warranty: req.body.warranty,
      },
    };
  } else if (category === "Clothing") {
    categoryFields = {
      clothing: {
        size: req.body.size,
        material: req.body.material,
      },
    };
  } else if (category === "Books") {
    categoryFields = {
      books: {
        author: req.body.author,
        isbn: req.body.isbn,
      },
    };
  } else if (category === "Toys") {
    categoryFields = {
      toys: {
        ageRange: req.body.ageRange,
      },
    };
  }

  const imageUrl = image.path;

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    category: category,
    userId: req.user,
    ...categoryFields,
  });

  try {
    await product.save();
    console.log("Created Product");
    res.redirect("/admin/products");
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit === "true";
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }

      // Extract category-specific fields based on product's category
      let categoryFields = {};
      if (product.category === "Electronics") {
        categoryFields.warranty = product.electronics.warranty;
      } else if (product.category === "Clothing") {
        categoryFields.size = product.clothing.size;
        categoryFields.material = product.clothing.material;
      } else if (product.category === "Books") {
        categoryFields.author = product.books.author;
        categoryFields.isbn = product.books.isbn;
      } else if (product.category === "Toys") {
        categoryFields.ageRange = product.toys.ageRange;
      }

      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: { ...product._doc, ...categoryFields }, // Include category-specific fields
        hasError: false,
        errorMessage: null,
        validationErrors: [],
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const updatedCategory = req.body.category;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        category: updatedCategory,
        _id: prodId,
        ...req.body, // Include other category-specific fields from the request body
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }

      // Remove old category-specific fields
      product.electronics = undefined;
      product.clothing = undefined;
      product.books = undefined;
      product.toys = undefined;

      // Update common fields
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      product.category = updatedCategory;

      // Update category-specific fields
      if (updatedCategory === "Electronics") {
        product.electronics = {
          warranty: req.body.warranty,
        };
      } else if (updatedCategory === "Clothing") {
        product.clothing = {
          size: req.body.size,
          material: req.body.material,
        };
      } else if (updatedCategory === "Books") {
        product.books = {
          author: req.body.author,
          isbn: req.body.isbn,
        };
      } else if (updatedCategory === "Toys") {
        product.toys = {
          ageRange: req.body.ageRange,
        };
      }

      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save().then((result) => {
        console.log("UPDATED PRODUCT!");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      console.log(products);
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return next(new Error("Product not found."));
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then(() => {
      console.log("DESTROYED PRODUCT");
      res.status(200).json({ message: "Success!" });
    })
    .catch((err) => {
      res.status(500).json({ message: "Deleting product failed." });
    });
};

exports.getProfile = (req, res, next) => {
  const userId = req.user._id;
  User.findById(userId)
    .then((user) => {
      crypto.randomBytes(32, (err, buffer) => {
        if (err) {
          console.log(err);
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        }
        const token = buffer.toString("hex");
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000; // One hour expiration
        user
          .save()
          .then(() => {
            // Render the profile page with updated user data
            return res.render("admin/profile", {
              pageTitle: "My Profile",
              path: "/admin/profile",
              user: user,
            });
          })
          .catch((err) => {
            console.log(err, "password");
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
          });
      });
      // Password reset logic ends here
    })
    .catch((err) => {
      console.log(err, "user");
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postProfile = (req, res, next) => {
  const userId = req.body.userId;
  const firstname = req.body.newFirst;
  const lastname = req.body.newLast;
  const number = req.body.newNumber;
  const email = req.body.newEmail;
  const about = req.body.newAbout;

  User.findById(userId)
    .then((user) => {
      user.email = email;
      user.firstName = firstname;
      user.lastName = lastname;
      user.number = number;
      user.about = about;
      return user.save().then((result) => {
        console.log("UPDATED USER!");
        res.redirect("/admin/profile");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProductOrders = async (req, res, next) => {
  const userId = req.session.user._id;

  try {
    const orders = await Order.find({ "products.product.userId": userId });

    const customerOrdersMap = new Map(); // Map to store orders grouped by customer

    for (const order of orders) {
      for (const product of order.products) {
        if (product.product.userId.toString() === userId.toString()) {
          // Check if product already exists for the customer
          if (customerOrdersMap.has(order.user.userId.toString())) {
            const existingOrderIndex = customerOrdersMap
              .get(order.user.userId.toString())
              .findIndex(
                (existingProduct) =>
                  existingProduct._id.toString() ===
                  product.product._id.toString()
              );
            if (existingOrderIndex !== -1) {
              // If product already exists, increase its quantity
              customerOrdersMap.get(order.user.userId.toString())[
                existingOrderIndex
              ].quantity += product.quantity;
            } else {
              // If product doesn't exist, add it to the customer's order
              const user = await User.findById(order.user.userId).select(
                "_id firstName lastName"
              );
              customerOrdersMap.get(order.user.userId.toString()).push({
                _id: product.product._id,
                title: product.product.title,
                price: product.product.price,
                description: product.product.description,
                imageUrl: product.product.imageUrl,
                user: user,
                quantity: product.quantity,
              });
            }
          } else {
            // If customer doesn't have any orders yet, create a new entry
            const user = await User.findById(order.user.userId);
            customerOrdersMap.set(order.user.userId.toString(), [
              {
                _id: product.product._id,
                title: product.product.title,
                price: product.product.price,
                description: product.product.description,
                imageUrl: product.product.imageUrl,
                user: user,
                quantity: product.quantity,
              },
            ]);
          }
        }
      }
    }

    const customerOrders = Array.from(customerOrdersMap.values());
    res.render("admin/product-orders", {
      pageTitle: "Customer Orders",
      path: "/admin/product-orders",
      orders: customerOrders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getCustomerOrders = (req, res, next) => {
  const customerId = req.params.customerId;
  const admin = req.session.user;
  User.findById(customerId)
    .then((user) => {
      res.render("admin/customer-profile", {
        pageTitle: "Customer Profile",
        path: "/admin/product-orders/customer",
        user: user,
        firstName: admin.firstName,
        userId: admin._id,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

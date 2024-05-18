const fs = require("fs");
const path = require("path");

const PDFDocument = require("pdfkit");
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_KEY);

const Product = require("../models/product");
const User = require("../models/user");
const Order = require("../models/order");

const ITEMS_PER_PAGE = 4;

let maxPrice;
let minPrice;

exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalItems;

  Product.find()
    .countDocuments()
    .then((numProducts) => {
        totalItems = numProducts;
        if (totalItems === 0) {
            return Promise.resolve([]);
        } else {
            return Product.find()
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(ITEMS_PER_PAGE);
        }
    })
    .then((products) => {
        if (products.length === 0) {
            return Promise.resolve([]);
        } else {
            return Product.aggregate([
                {
                    $group: {
                        _id: null,
                        maxPrice: { $max: "$price" },
                        minPrice: { $min: "$price" },
                    },
                },
            ]).then((result) => {
                maxPrice = result[0].maxPrice;
                minPrice = result[0].minPrice;
                return products;
            });
        }
    })
    .then((products) => {
        console.log(products);
        res.render("shop/product-list", {
            prods: products,
            pageTitle: "Products",
            path: "/products",
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            maxPrice: maxPrice || 0,
            minPrice: minPrice || 0,
        });
    })
    .catch((err) => {
        const error = new Error(err);
        console.log(err);
        error.httpStatusCode = 500;
        return next(error);
    });

};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      User.findById(product.userId)
        .then((user) => {
          const userDetails = {
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
          };

          let totalRating = 0;
          let rating = 0;
          if (product.reviews.length > 0) {
            product.reviews.forEach((review) => {
              totalRating += review.rating;
            });
            const averageRating = totalRating / product.reviews.length;
            rating = averageRating;
          } else {
            rating = 0; // If there are no reviews, set average rating to 0
          }

          res.render("shop/product-detail", {
            user: userDetails,
            product: product,
            rating: rating,
            pageTitle: product.title,
            path: "/products",
          });
        })
        .catch((err) => {
          const error = new Error(err);
          error.httpStatusCode = 500;
          return next(error);
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getFilteredProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  const category = req.query.category || "";
  const searchTerm = req.query.searchTerm || "";
  const low = parseInt(req.query.low) || 0;
  const high = parseInt(req.query.high) || Infinity;

  const filter = {
    $or: [
      { title: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ],
    price: { $gte: low, $lte: high },
  };
  if (category) {
    filter.category = category;
  }
  Product.find(filter)
    .countDocuments()
    .then((totalItems) => {
      console.log(totalItems);
      return Product.find(filter)
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
        .then((products) => {
          res.render("shop/product-list", {
            prods: products,
            pageTitle: "Products",
            path: "/products",
            currentPage: page,
            hasNextPage: ITEMS_PER_PAGE * page < totalItems,
            hasPreviousPage: page > 1,
            nextPage: page + 1,
            previousPage: page - 1,
            lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
            maxPrice: maxPrice,
            minPrice: minPrice,
          });
        });
    })
    .catch((err) => {
      console.log("Error fetching filtered products:", err);

      console.error("Error fetching filtered products:", err);
      const error = new Error(
        "An error occurred while fetching filtered products."
      );
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  res.render("shop/index", {
    pageTitle: "Shop",
    path: "/",
    error: "",
  });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product, "add");
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.updateCart = (req, res, next) => {
  const productId = req.params.productId;
  const action = req.query.action;

  Product.findById(productId)
    .then((product) => {
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (action === "add" || action === "remove") {
        req.user
          .addToCart(product._id, action === "add" ? "add" : "remove")
          .then(() => {
            return res.status(200).json({
              quantity: req.user.cart.items.find(
                (item) => item.productId.toString() === productId.toString()
              ).quantity,
            });
          })
          .catch((err) => {
            console.error("Error updating cart:", err);
            return res.status(500).json({ error: "Internal server error" });
          });
      } else {
        return res.status(400).json({ error: "Invalid action" });
      }
    })
    .catch((err) => {
      console.error("Error finding product:", err);
      return res.status(500).json({ error: "Internal server error" });
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      let total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,
        totalSum: total,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  // Token is created using Checkout or Elements!
  // Get the payment token ID submitted by the form:
  const token = req.body.stripeToken; // Using Express
  let totalSum = 0;

  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      user.cart.items.forEach((p) => {
        totalSum += p.quantity * p.productId.price;
      });

      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      stripe.charges.create({
        amount: totalSum * 100,
        currency: "usd",
        description: "Demo Order",
        source: token,
        metadata: { order_id: result._id.toString() },
      });
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
        userId: req.user._id,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found."));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      }
      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text("Invoice", {
        underline: true,
      });
      pdfDoc.text("-----------------------");
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            prod.product.title +
              " - " +
              prod.quantity +
              " x " +
              "$" +
              prod.product.price
          );
      });
      pdfDoc.text("---");
      pdfDoc.fontSize(20).text("Total Price: $" + totalPrice);

      pdfDoc.end();
    })
    .catch((err) => next(err));
};

exports.getVendorProfile = (req, res, next) => {
  const userId = req.params.userId;
  const page = +req.query.page || 1;
  let totalItems;
  let totalUserProducts;

  let prodsPromise = Product.find({ userId: userId })
    .skip((page - 1) * ITEMS_PER_PAGE)
    .limit(ITEMS_PER_PAGE)
    .exec();

  let userPromise = User.findById(userId).exec();

  let userProductsCountPromise = Product.find({ userId: userId })
    .countDocuments()
    .exec();

  let totalProductsCountPromise = Product.find().countDocuments().exec();

  Promise.all([
    prodsPromise,
    userPromise,
    userProductsCountPromise,
    totalProductsCountPromise,
  ])
    .then(
      ([productsWithUserId, user, userProductsCount, totalProductsCount]) => {
        if (!user) {
          throw new Error("No user found.");
        }
        totalItems = totalProductsCount;
        if (userProductsCount.length > 0) {
          totalUserProducts = userProductsCount;
        } else {
          totalUserProducts = 0;
        }
        res.render("shop/profile", {
          path: "/profile",
          user: user,
          pageTitle: user.firstName + "'s profile",
          products: productsWithUserId,
          currentPage: page,
          hasNextPage: ITEMS_PER_PAGE * page < totalItems,
          hasPreviousPage: page > 1,
          nextPage: page + 1,
          previousPage: page - 1,
          lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
          totalUserProducts: totalUserProducts,
          userId:req.session.user._id
        });
      }
    )
    .catch((err) => {
      console.log(err);
      next(err)});
};

exports.getReviews = (req, res, next) => {
  const productId = req.params.productId;
  Product.findById(productId)
    .select("reviews title _id")
    .then((product) => {
      if (!product) {
        console.log("Product not found");
        return;
      }

      // Create an array to store promises for fetching user details
      const userDetailsPromises = [];

      // Loop through each review and push a promise to fetch user details for that review
      product.reviews.forEach((review) => {
        const userPromise = User.findById(review.userId)
          .then((user) => {
            return {
              firstName: user.firstName,
              lastName: user.lastName,
            };
          })
          .catch((err) => {
            console.error("Error fetching user:", err);
            throw err; // Rethrow the error to be caught later
          });

        userDetailsPromises.push(userPromise);
      });

      // Wait for all user detail promises to resolve
      return Promise.all(userDetailsPromises)
        .then((userDetails) => {
          // Pass the user details along with other data to the template
          res.render("shop/reviews", {
            path: "/reviews",
            pageTitle: product.title + " Reviews",
            reviews: product.reviews,
            productName: product.title,
            userDetails: userDetails,
            productId: productId,
          });
        })
        .catch((err) => {
          console.error("Error fetching user details:", err);
          const error = new Error(
            "An error occurred while fetching user details."
          );
          error.httpStatusCode = 500;
          throw error; // Rethrow the error to be caught later
        });
    })
    .catch((err) => {
      console.error("Error fetching reviews:", err);
      const error = new Error("An error occurred while fetching reviews.");
      error.httpStatusCode = 500;
      return next(error);
    });
};

const mongoose = require("mongoose");

exports.postReviews = async (req, res, next) => {
  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();

    const userId = req.session.user._id;
    const productId = req.body.productId;
    const text = req.body.text || " ";
    const rating = req.body.rating;

    const product = await Product.findById(productId).session(session);
    if (!product) {
      console.log("Product not found");
      throw new Error("Product not found");
    }

    const existingReview = product.reviews.find((review) =>
      review.userId.equals(userId)
    );
    if (existingReview) {
      existingReview.rating = rating;
      existingReview.text = text;
    } else {
      product.reviews.push({ userId, text, rating });
    }

    await product.save({ session });

    await session.commitTransaction();
    session.endSession();

    console.log("Review added or updated successfully");
    res.redirect(`/product/reviews/${productId}`);
  } catch (error) {
    console.error("Error adding or updating review:", error);
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    const err = new Error(
      "An error occurred while adding or updating the review."
    );
    err.httpStatusCode = 500;
    return next(err);
  }
};

const http = require("http");

exports.chat = (req, res, next) => {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }
  // Prepare data to be sent in the POST request body
  const admin = req.session.user;
  const postData = {
    email: admin.email,
    password: admin.password,
  };

  const options = {
    hostname: "host.docker.internal",
    port: 3001,
    path: "/api/check-user",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Data: JSON.stringify(postData),
    },
  };
  let session;
  const request = http.request(options, (serverRes) => {
    serverRes.on("data", (chunk) => {
      session = JSON.parse(chunk).session;
      console.log(`Received session from server: ${session}`);
    });

    serverRes.on("end", () => {
      if (serverRes.statusCode === 200) {
        const sessionString = session;
        const redirectUrl = `http://localhost:3001?session=${sessionString}`;
        const script = `
        <script>
          window.open("${redirectUrl}", "_blank");
        </script>
      `;
        res.writeHead(200, { "Content-Type": "text/html" });
        res.write(script);
        res.end();
      } else {
        res.status(500).end("Server response indicates failure");
      }
    });
  });

  request.on("error", (error) => {
    console.error("Error sending POST request:", error);
    res.status(500).end("Error sending data");
  });

  // Send the POST request body
  request.write(JSON.stringify(postData));
  request.end();
};

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  number: {
    type: String,
    required: false,
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: function () {
            return this.userType === "customer";
          },
        },
        quantity: {
          type: Number,
          required: function () {
            return this.userType === "customer";
          },
        },
      },
    ],
  },
  about: {
    type: String,
  },
});
if (userSchema.path('userType').enumValues.includes('customer')) {
  userSchema.add({
    cart: {
      type: {
        items: [
          {
            productId: {
              type: Schema.Types.ObjectId,
              ref: "Product",
              required: true,
            },
            quantity: {
              type: Number,
              required: true,
            },
          },
        ],
      },
      required: true,
    },
  });
}
userSchema.methods.addToCart = function (product, action) {
  const cartProductIndex = this.cart.items.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
  });

  const updatedCartItems = [...this.cart.items];

  if (action === "add") {
    if (cartProductIndex >= 0) {
      updatedCartItems[cartProductIndex].quantity++;
    } else {
      updatedCartItems.push({
        productId: product._id,
        quantity: 1,
      });
    }
  } else if (action === "remove") {
    if (cartProductIndex >= 0) {
      updatedCartItems[cartProductIndex].quantity--;
      if (updatedCartItems[cartProductIndex].quantity <= 0) {
        updatedCartItems.splice(cartProductIndex, 1);
      }
    }
  } else {
    return Promise.reject(new Error("Invalid action"));
  }

  this.cart.items = updatedCartItems;
  return this.save();
};

userSchema.methods.removeFromCart = function (productId) {
  const updatedCartItems = this.cart.items.filter((item) => {
    return item.productId.toString() !== productId.toString();
  });
  this.cart.items = updatedCartItems;
  return this.save();
};

userSchema.methods.clearCart = function () {
  this.cart = { items: [] };
  return this.save();
};

module.exports = mongoose.model("User", userSchema);

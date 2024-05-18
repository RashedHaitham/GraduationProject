const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
  },
});

const productSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category: {
    type: String,
    enum: ['Electronics', 'Clothing', 'Books', 'Toys'],
    required: true,
  },
  electronics: {
    warranty: {
      type: String,
      required: function() { return this.category === 'Electronics'; },
    },
  },
  clothing: {
    size: {
      type: String,
      required: function() { return this.category === 'Clothing'; },
    },
    material: {
      type: String,
      required: function() { return this.category === 'Clothing'; },
    },
  },
  books: {
    author: {
      type: String,
      required: function() { return this.category === 'Books'; },
    },
    isbn: {
      type: String,
      required: function() { return this.category === 'Books'; },
    },
  },
  toys: {
    ageRange: {
      type: String,
      required: function() { return this.category === 'Toys'; },
    },
  },
  reviews: [reviewSchema],
});
productSchema.methods.addReview = function (userId, text, rating) {
  this.reviews.push({
    userId: userId,
    text: text,
    rating: rating,
  });

  return this.save();
};

module.exports = mongoose.model("Product", productSchema);

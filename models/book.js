const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//defining
const BookSchema = new Schema({
  name: {
    required: true,
    type: String,
  },
  name_lower: {
    required: true,
    type: String,
  },
  genre: String,
  genre_lower: String,
  author: String,
  author_lower: String,
  ISBN: String,
  publisher: String,
  publisher_lower: String,
  count: Number,
  available: Number,
  updated_at: Number,
  updated_by: String,
  created_at: {
    type:Number,
    required: true,
    default: Date.now
  },
  created_by: String,
  cover: {
    type: String,
    default: "default"
  }
});

//compiling
const Book = mongoose.model("Book", BookSchema);

module.exports = Book;

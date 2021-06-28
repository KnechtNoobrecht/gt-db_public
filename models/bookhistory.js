const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//defining
const BookHistorySchema = new Schema({
  bookid: String,
  name: String,
  bname: String,
  class: String,
  date: String,
  created_at: Number,
  created_by: String,
  closed_at: Number,
  closed_by:String,
  expiring_at: Number
});

//compiling
const BookHistory = mongoose.model("BookHistory", BookHistorySchema);

module.exports = BookHistory;

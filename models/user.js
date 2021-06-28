const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//defining
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  firstname: String,
  lastname: String,
  email: {
    type: String,
    required: true,
    unique: true
  },
  admin: {
    type: Boolean,
    default: false,
  },
  manager: {
    type: Boolean,
    default: false,
  },
  pwhash: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  userimg: {
    type: String,
    default: "standard"
  },
  history: Array,
  pwresettime: Number,
  pwresetuuid: String
});

UserSchema.methods.validPassword = function (pwd) {
  return this.pwhash === pwd;
};

//compiling
const User = mongoose.model("User", UserSchema);

module.exports = User;

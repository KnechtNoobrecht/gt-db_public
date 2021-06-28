const LocalStrategy = require('passport-local').Strategy;
const CryptoJS = require('crypto-js');

// Load User model
const User = require('../models/user');

module.exports = function(passport) {
  passport.use(new LocalStrategy({
    passReqToCallback: true},
  function(req, username, password, done) {
    password = CryptoJS.SHA256(password).toString(CryptoJS.enc.Base64);
    
      User.findOne({ username: username}, function(err, user) {
      if (err) {
        console.log('Passport error: ' + err)
        return done(err, req.flash('error','error'));
      }
      if (!user) {
        return done(null, false, req.flash('error','user'));
      }
      if (!user.validPassword(password)) {
        return done(null, false, req.flash('error','pw'));
      }
      return done(null, user);
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

};
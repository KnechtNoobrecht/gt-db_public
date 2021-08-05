// declaration/requirements
const { connectdb } = require("./app_extension");
const { getAllBooks } = require("./app_extension");
const { getAllUsers } = require("./app_extension");
const { updatedate } = require("./app_extension");
const { getexpsoon } = require("./app_extension");
const { getexprd } = require("./app_extension");
const { createid } = require("./app_extension");
const { ensureAuthenticated } = require("./app_extension");
const { ensureManager } = require("./app_extension");
const { userExists } = require("./app_extension");
const { aufdroeselisierung } = require("./app_extension");
const { mailvalidation } = require("./app_extension");
const { formatDate } = require("./app_extension");
const { sortName } = require("./app_extension");
const { sortGenre } = require("./app_extension");
const { sortAuthor } = require("./app_extension");
const { sortPublisher } = require("./app_extension");
const { sortISBN } = require("./app_extension");
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const io = (app.io = require("socket.io")());
const User = require("./models/user");
const Book = require("./models/book");
const BookHistory = require('./models/bookhistory');
const CryptoJS = require("crypto-js");
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const https = require("https");
const fs = require("fs");
const cron = require("node-cron");
const nodemailer = require('nodemailer');
const options = {
  key: fs.readFileSync("./server.key"),
  cert: fs.readFileSync("./server.crt")
};
const server = https.createServer(options, app);
io.attach(server);
const upload = require("express-fileupload");
const { create } = require("./models/user");
const { domainToASCII } = require("url");
const { log } = require("console");
const port = process.env.SRVPORT;
var expired;
var expiringsoon;
var owner;

//Config
require("./config/passport")(passport);

app.use(upload());
//EJS
app.use(expressLayouts);
app.set("view engine", "ejs");

// Express body parser
app.use(express.urlencoded({ extended: true }));

//Import resources
app.use(express.static(__dirname + "/public/"));
app.use(express.urlencoded({ extended: true }));

//mail config
const transporter = nodemailer.createTransport({
  host: 'gym-trittau.de',
  port: 25,
  secure: false,
  auth: {
    type: 'custom',
    user: 'password.reset',
    pass: process.env.MAILPASSWORD
  }
})

//check for expired/expiring soon books every day at 5am
cron.schedule('0 0 5 1-31 1-12 0-7', async () => {
  expired = await getexprd();
  expiringsoon = await getexpsoon();
})

// Express session
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

//login page
app.get('/', function (req, res) {
  console.log("\x1b[32m","[app] GET: /","\x1b[0m");
    const errors = req.flash().error || [];
    if (req.isAuthenticated()) {
      res.redirect('/dashboard')
    } else if(!req.isAuthenticated()) {
      res.render('index',{
        layout: './layouts/layout_index.ejs',
        title: "Login - GT-DB",
        errors
      });
    } else {
      res.send("Etwas ist schief gelaufen. Bitte versuche es erneut")
    }
});

//register page
app.get('/register', function (req, res) {
  console.log("\x1b[32m","[app] GET: /register","\x1b[0m");
    const errors = req.flash('error');
    res.render('register',{
      layout: './layouts/layout_index.ejs',
      title:"Registrieren - GT-DB",
      errors
    });
});

//login post
app.post("/auth/login", passport.authenticate("local", {
  failureRedirect: "/",
  failureFlash: true
  }), 
  function(req,res) {
    res.redirect(req.session.dest || "/dashboard");
    delete req.session.dest;
  }
);

// Logout
app.get("/auth/logout", function (req, res) {
  console.log("\x1b[32m","[app] POST: /auth/logout","\x1b[0m");
  req.logout();
  res.redirect("/");
});

app.get("/findUser/:keyword",async function(req,res) {
  keyword = req.params.keyword
  console.log(keyword);
  User.find({username: keyword}).then(function(results) {
    console.log(results);
    res.send(results)
  })
})

app.get("/deleteUserByID/:userID", ensureAuthenticated, async function(req,res) {
  if(req.user.id == owner.id) {
    User.deleteOne({_id: req.params.userID}).then(
      res.send("Erfolgreich")
    ).catch(err => res.send(err))
  } else {
    res.redirect('/')
  }
})

app.post("/auth/signup", async function (req, res) {
  console.log("\x1b[32m","[app] POST: /auth/signup","\x1b[0m");
  if (mailvalidation(req.body.mailsignup.toLowerCase()) == true) {
    if(req.body.passwordsignup.length >= 8) {
      if (req.body.passwordsignup == req.body.passwordrptsignup) {
        var name = aufdroeselisierung(req.body.mailsignup.toLowerCase());
        var newUser = new User({
          username: name[2],
          firstname: name[0],
          lastname: name[1],
          email: req.body.mailsignup.toLowerCase(),
          pwhash: CryptoJS.SHA256(req.body.passwordsignup).toString(CryptoJS.enc.Base64),
        });
        userExists(req.body.mailsignup).then(function(userExists) {
          if (!!!userExists) {
            newUser.save().then(function () {
                req.flash('message',name[2])
                res.redirect('/success');
              })
              .catch(function (err) {
                console.log(err);
                res.redirect('/register');
              });
          } else {
            req.flash('error','existingmail');
            res.redirect('/register');
          } 
        })
      } else {
        req.flash('error','pwmatch');
        res.redirect('/register');
      }
    } else {
      req.flash('error','pwlength');
      res.redirect('/register');
    }
  } else {
    req.flash('error','invalidmail');
    res.redirect('/register');
  }
});

app.get('/book/:bookid', ensureAuthenticated, ensureManager, async function(req,res) {
  console.log("\x1b[32m","[app] GET: /book/"+req.params.bookid,"\x1b[0m");
  async function searchbookbyid(params) {
    var book = await Book.findById(params).catch(err => {console.log(err)});
    return book;
  }
  async function searchbhistory(params) {
    var bhistory = await BookHistory.find({ bookid: params }).catch(err => {console.log(err)});
    return bhistory;
  }
  date = Date.now();
  date = new Date(date);
  date = formatDate(date);
  try {
    b1 = await searchbookbyid(req.params.bookid);
    b2 = await searchbhistory(req.params.bookid);
  } catch (error) {
    console.log(error);
    res.redirect('/')
  }
  const error = req.flash('errormsg');
  const success = req.flash('success');
  try {
    res.render("book", {
      layout: './layouts/layout_books.ejs',
      book: b1,
      bhistory: b2,
      user: req.user,
      date: date,
      title:b1.name+" - GT-DB",
      success: success,
      error: error
    })
  } catch (error) {
    res.redirect('/book/')
  }
});

app.post('/book/submit', ensureAuthenticated, ensureManager, async function(req,res) {
  console.log("\x1b[32m","[app] POST: /book/submit","\x1b[0m");
  var bid = req.body.bookid;
  var thirtydays = 1000*60*60*24*30;
  var date = req.body.date;
  date = Math.round(new Date(date.slice(6,10)+"-"+date.slice(3,5)+"-"+date.slice(0,2)+" 00:00:00.000").getTime())
  var expdate = date+thirtydays;
  var newBookHistory = new BookHistory({
    bookid: bid,
    name: req.body.name,
    bname: req.body.bookname,
    class: req.body.class,
    date: "seit "+req.body.date,
    created_at: Date.now(),
    created_by: req.user.username,
    expiring_at: expdate
  });
  async function updatebookhiring(available) {
    available = available - 1;
    await Book.updateOne(
      { _id: bid },
      {available: available}
    );
  };
  async function searchbookbyid(params) {
    var book = await Book.findById(params);
    return book;
  };

  expiringsoon = await getexpsoon();
  expired = await getexprd();

  newBookHistory.save().then(
    searchbookbyid(bid).then((book) => {
      updatebookhiring(book.available).then(
        io.to(bid).emit('bookupdate'),
        res.redirect('/book/'+bid)
      );
    })
  );
});

app.get('/book/drop/id=:id&bid=:bookid', ensureAuthenticated, ensureManager, async function(req,res) {
  console.log("\x1b[32m","[app] GET: /book/drop/id="+req.params.id+"&bid="+req.params.bookid,"\x1b[0m");
  var date = Date.now();
  var date = new Date(date);
  var date = formatDate(date);//
  var bid = req.params.bookid;
  var id = req.params.id;
  var url = '/book/drop/id='+id+'&'+'bid='+bid;

  async function updatebookhiring() {
    var book = await Book.findById(bid);
    var available = book.available;
    var available = available + 1;
    await Book.updateOne(
      { _id: bid },
      {available: available}
    );
  };

  async function updatebhistory() {
    var bhistory = await BookHistory.findById(id);
    var updateddate = updatedate(bhistory.date);
    await BookHistory.updateOne(
      { _id: id },
      { date: updateddate, closed_at: Date.now(), closed_by: req.user.username, expiring_at: "0" });
  };

  expiringsoon = await getexpsoon();
  expired = await getexprd();

  updatebookhiring()
    .then(updatebhistory())
    .then(
      io.to(bid).emit('bookupdate'),
      res.redirect("/book/" + bid
      ));
});

app.get('/addbook', ensureAuthenticated, ensureManager, function(req,res) {
  console.log("\x1b[32m","[app] GET: /addbook","\x1b[0m");
  res.render("addbook", {
    user: req.user,
    layout: './layouts/layout_dashboard.ejs',
    title: "Buch hinzufügen - GT_DB"
  });
});

app.post("/addbook", ensureAuthenticated, ensureManager, function(req,res) {
  console.log("\x1b[32m","[app] POST: /addbookbook","\x1b[0m");
  if(req.body.count.match(/^[1-9]+$/) == null) {
    var newBook = new Book({
      name: req.body.name,
      name_lower: req.body.name.toLowerCase(),
      genre: req.body.genre,
      genre_lower: req.body.genre.toLowerCase(),
      author: req.body.author,
      author_lower: req.body.author.toLowerCase(),
      ISBN: req.body.isbn,
      publisher: req.body.publisher,
      publisher_lower: req.body.publisher.toLowerCase(),
      count: req.body.count,
      available: req.body.count,
      created_by: req.user.username
    });
    newBook.save().then(function () {
      res.redirect("/addbook")
    }).catch(function(err) {
      console.log(err);
      res.redirect("/addbook")
    });
  } else {
    res.redirect('/addbook')
  }
});

app.get('/administration', ensureAuthenticated, ensureManager, function (req, res) {
  console.log("\x1b[32m","[app] GET: /administration","\x1b[0m");
  getAllUsers().then((users) => {
    users.sort((a, b) => {
      let xa = a.lastname.toLowerCase();
      let xb = b.lastname.toLowerCase();
  
      if (xa < xb) {
          return -1;
      }
      if (xa > xb) {
          return 1;
      }
      return 0;
    });
    res.render("administration", {
      user: req.user,
      users: users,
      layout:'./layouts/layout_dashboard.ejs',
      title: "Administration - GT-DB"
    });
  });
});

// Dashboard auth
app.get("/dashboard", ensureAuthenticated, ensureManager, function (req, res) {
  console.log("\x1b[32m","[app] GET: /dashboard","\x1b[0m");
  getAllBooks().then((books) => {
    res.render("dashboard", {
      user: req.user,
      books: books,
      layout:'./layouts/layout_dashboard.ejs',
      title: "Dashboard - GT-DB"
    });
  });
});

app.get("/xprd", ensureAuthenticated, ensureManager, function (req, res) {
  console.log("\x1b[32m","[app] GET: /xprd","\x1b[0m");
  res.send(expired)
});

app.get("/expsoon", ensureAuthenticated, ensureManager, function (req, res) {
  console.log("\x1b[32m","[app] GET: /expsoon","\x1b[0m");
  res.send(expiringsoon)
});

app.get("/settings", ensureAuthenticated, ensureManager, function (req, res) {
  console.log("\x1b[32m","[app] GET: /settings","\x1b[0m");
  const error = req.flash('error') || [];
  const success = req.flash('success') || [];
  res.render("settings", {
    user: req.user,
    layout: './layouts/layout_dashboard.ejs',
    title: "Einstellungen - GT-DB",
    error: error,
    success: success
  });
});

app.get("/book", ensureAuthenticated, ensureManager, async function (req, res) {
  console.log("\x1b[32m","[app] GET: /book/","\x1b[0m");
  var start = req.query.s;
  count=25;
  s2=Number(start)+count
  var books = await getAllBooks();
  books.sort((a, b) => {
    let xa = a.name.toLowerCase();
    let xb = b.name.toLowerCase();

    if (xa < xb) {
        return -1;
    }
    if (xa > xb) {
        return 1;
    }
    return 0;
  });
  if (start) {
    console.log("\x1b[32m","[app] GET: /book/?s="+start,"\x1b[0m");
    s2=Number(start)+count
    books = books.slice(start,s2)
    res.send(books)
  } else {
    res.render("table", {
      user: req.user,
      layout: './layouts/layout_dashboard.ejs',
      title: "Alle Bücher - GT-DB"
    });
  }
});

app.get("/search", ensureAuthenticated, ensureManager, async function (req,res) {
  console.log("\x1b[32m","[app] GET: /search","\x1b[0m");
  var param = req.query.p;
  var start = req.query.s;
  var filter = req.query.f;
  console.log("\x1b[32m","[app] GET: /search/?p="+req.query.p+"&s="+req.query.s+"&f="+req.query.f,"\x1b[0m")
  var count = 20

  if(param) {
    var docsname = await Book.find({name_lower:{"$regex": param.toLowerCase()}})
    var docsgenre = await Book.find({genre_lower:{"$regex": param.toLowerCase()}})
    var docsauthor = await Book.find({author_lower:{"$regex": param.toLowerCase()}})
    var docsISBN = await Book.find({ISBN:{"$regex": param}})
    var docspublisher = await Book.find({publisher_lower:{"$regex": param.toLowerCase()}})
    var resultscount = docsname.length + docsgenre.length + docsauthor.length + docsISBN.length + docspublisher.length;

    if (start) {
      switch(filter) {
        case "n":
            s2=Number(start)+count
            res.send(docsname.slice(start,s2))
          break;
        case "g":
            s2=Number(start)+count
            res.send(docsgenre.slice(start,s2));
          break;
        case "a":
            s2=Number(start)+count
            res.send(docsauthor.slice(start,s2));
          break;
        case "i":
            s2=Number(start)+count
            res.send(docsISBN.slice(start,s2));
          break;
        case "p":
            s2=Number(start)+count
            res.send(docspublisher.slice(start,s2));
          break;
        default:
          res.end();
      }
      
      } else {
      res.render("search", {
        layout: './layouts/layout_search.ejs',
        user: req.user,
        resultscount: resultscount,
        param: param,
        title:"Suchen - GT-DB"
      });
    }

  } else {
    //res.redirect("/dash
    res.render("search", {
      layout: './layouts/layout_search.ejs',
      user: req.user,
      resultscount: resultscount,
      param: param,
      title:"Suchen - GT-DB"
    })
  }
});

app.get("/searchv2", ensureAuthenticated, ensureManager, async function (req,res) {
  var param = req.query.p;
  var start = req.query.s;
  var filter = req.query.f;
  var count = 20
  var docs = []
  var resultscount = undefined;
  console.log("\x1b[32m","[app] GET: /searchv2/?p="+param+"&s="+start+"&f="+filter,"\x1b[0m")

  const searchByParam = {
    'n': async () => {
      docs[0] = await Book.find({name_lower:{"$regex": param.toLowerCase()}}),
      docs[0] = docs[0].sort(sortName),
      resultscount = docs[0].length
    },
    'g': async () => {
      docs[1] = await Book.find({genre_lower:{"$regex": param.toLowerCase()}}),
      docs[1] = docs[1].sort(sortGenre),
      resultscount = docs[1].length
    },
    'a': async () => {
      docs[2] = await Book.find({author_lower:{"$regex": param.toLowerCase()}}),
      docs[2] = docs[2].sort(sortAuthor),
      resultscount = docs[2].length
    },
    'i': async () => {
      docs[3] = await Book.find({ISBN:{"$regex": param.toLowerCase()}}),
      docs[3] = docs[3].sort(sortISBN),
      resultscount = docs[3].length
    },
    'p': async () => {
      docs[4] = await Book.find({publisher_lower:{"$regex": param.toLowerCase()}}),
      docs[4] = docs[4].sort(sortPublisher),
      resultscount = docs[4].length
    },
    undefined : () => {
      return
    }
  }

  if(param && start) {
    await searchByParam[filter]();
      switch(filter) {
        case "n":
          s2=Number(start)+count
          res.send({results: docs[0].slice(start,s2), resultscount: resultscount})
          break;
        case "g":
          s2=Number(start)+count
          res.send({results: docs[1].slice(start,s2), resultscount: resultscount});
          break;
        case "a":
          s2=Number(start)+count
          res.send({results: docs[2].slice(start,s2), resultscount: resultscount});
          break;
        case "i":
          s2=Number(start)+count
          res.send({results: docs[3].slice(start,s2), resultscount: resultscount});
          break;
        case "p":
          s2=Number(start)+count
          res.send({results: docs[4].slice(start,s2), resultscount: resultscount});
          break;
        default:
          res.end();
      }
  } else {
    res.render("searchv2", {
      layout: './layouts/layout_search.ejs',
      user: req.user,
      param: param,
      title:"Suchen - GT-DB"
    })
  }
});

app.post("/createresetid", async function (req, res) {
  mail = req.body.mail;
  id = createid(24)
  let mailoptions = {
    from: 'Schülerbücherei Gymnasium Trittau',
    to: mail,
    subject: 'Passwort zurücksetzen',
    text: "Moin. Hier ist der Link um Dein Passwort zurückzusetzen: https://buecherei.gym-trittau.de/reset_password/?uuid="+id+"Er ist für 15 Minuten gültig. Dein Schülerbücherei-Team",
    html: "<body style='margin:0;padding:0;width:100%;height:100%;'><div> <span style='font-family: Arial, Helvetica, sans-serif;'>Moin.</span> <br><br> <span style='font-family: Arial, Helvetica, sans-serif;' >Hier ist der Link um Dein Passwort zurückzusetzen: </span> <a style='left:50%;top: 30%;position:absolute;transform: translateX(-50%);text-decoration:underline;font-family: Arial, Helvetica, sans-serif;padding: 50px;text-align: center;border-radius: 8px;vertical-align: middle;transition: .25s;border: 1px solid transparent;box-shadow: 0 2px 16px 0 rgba(0, 0, 0, .25), 0 3px 15px 8px rgba(0, 0, 0, 0.08);' href='https://buecherei.gym-trittau.de/reset_password/?uuid="+id+"'>Passwort zurücksetzen</a><br><span style='font-family: Arial, Helvetica, sans-serif;'>Er ist für 15 Minuten gültig.</span><br><br> <span style='font-family: Arial, Helvetica, sans-serif;'> Dein Schülerbücherei-Team </span> </div></body>"
  }
  date = Date.now()+1000*60*15 // 15 minutes in milliseconds
  if(User.findOne({email:mail})){
    await User.updateOne({email: mail},{pwresettime:date,pwresetuuid:id}).then(
      transporter.sendMail(mailoptions, function (err) {
        if (err) {
          console.log(err)
          req.flash('errormsg','Das hat nicht funktioniert. Vielleicht ist die Mailadresse ungültig.'),
          res.redirect('/reset_password')
        } else {
          req.flash('success','Falls ein Account mit der Mailadresse besteht, haben wir Dir einen Link geschickt. Bitte prüfe auch Deinen Spamordner.'),
          res.redirect('/reset_password')
        }
      }),
    ).catch(err => {
      console.trace(err)
      req.flash('errormsg','Das hat nicht funktioniert. Bitte versuche es später erneut.');
      res.redirect('/reset_password');
    })
  } else {
    req.flash('success','Falls ein Account mit der Mailadresse besteht, haben wir Dir einen Link geschickt. Bitte prüfe auch Deinen Spamordner.'),
    res.redirect('/reset_password')
  }
});

app.post("/new_password", async function (req, res) {
  if(req.body.password.length >7 && req.body.password == req.body.passwordrpt) {
    var id = req.flash('id')
    await User.updateOne({_id:id}, {pwhash:CryptoJS.SHA256(req.body.password).toString(CryptoJS.enc.Base64)}).then(() => {
      User.updateOne({_id:id},{pwresettime:0,pwresetuuid:""}).then(() => {
        req.flash('success','Passwort efolgreich geändert.'),
        res.redirect('/reset_password')
      }).catch(err => {
        console.trace(err);
        req.flash('errormsg','Das hat nicht funktioniert. Bitte versuche es später erneut.');
        res.redirect('/reset_password')
      })
    }).catch(err => {
      console.trace(err);
      req.flash('errormsg','Das hat nicht funktioniert. Bitte versuche es später erneut.')
      res.redirect('/reset_password')
    })
  } else {
    req.flash('errormsg','Das hat nicht funktioniert. Bitte versuche es später erneut.')
    res.redirect('/reset_password')
  }
})

app.get("/reset_password/",  async function (req,res) {
  if(req.query.uuid) {
    await User.findOne({pwresetuuid:req.query.uuid}).then(result => {
      if(result) {
        if(result.pwresettime > Date.now()) {
          req.flash('id',result._id)
          res.render('createnewpassword', {
            title: 'Passwort zurücksetzen - GT-DB',
            layout: './layouts/layout_dashboard.ejs'
          })
        } else {
          req.flash('errormsg','Dieser Link ist abgelaufen.')
          res.redirect('/reset_password')
        }
      } else {
        req.flash('errormsg','Dieser Link wurde bereits genutzt.')
        res.redirect("/reset_password")
      }
    })
  } else {
    const error = req.flash('errormsg');
    const success = req.flash('success')
    res.render('resetpassword', {
      title: 'Passwort zurücksetzen - GT-DB',
      layout: './layouts/layout_dashboard.ejs',
      success: success,
      error: error
    })
  }
});

app.post("/changepassword", ensureAuthenticated, ensureManager, async function (req,res) {
  console.log("\x1b[32m","[app] POST: /changepassword","\x1b[0m");
  if(req.body.currentpw && req.body.newpw == req.body.repeatpw) {
    pw = CryptoJS.SHA256(req.body.newpw).toString(CryptoJS.enc.Base64);
    await User.updateOne({_id: req.user.id},{pwhash: pw}).then(() => {
      req.flash('success', 'Passwort erfolgreich geändert.')
        res.redirect('/settings')
    });
  } else {
    req.flash('error', 'Das hat nicht funktioniert. Bitte versuche es später erneut.')
    res.redirect('/settings')
  }
});

app.post("/editpersonaldata", ensureAuthenticated, ensureManager, async function (req,res) {
  console.log("\x1b[32m","[app] POST: /editpersonaldata","\x1b[0m");
  if(req.body.username.length > 0) {
    await User.findOne({username: req.body.username}).then(async results => {
      if(results) {
        req.flash('error', 'Dieser Benutzername wird bereits verwendet. Bitte versuche es mit einem Anderen.');
        res.redirect('/settings')
      } else if(!results) {
        await User.updateOne({_id: req.user.id}, {
          firstname: req.body.firstname, 
          lastname: req.body.lastname, 
          username: req.body.username}).then(() => {
            req.flash('success','Persönliche Daten erfolgreich geändert.');
            res.redirect('/settings');
        }).catch(function (err) {
          console.log(err);
        });
      } else {
        req.flash('error','Das hat nicht geklappt. Bitte versuche es später erneut.');
        res.redirect('/settings');
      }
    });
  } else {
    req.flash('error','Das hat nicht geklappt. Bitte versuche es später erneut.');
    res.redirect('/settings')
  }
});

app.post("/user/toggleRole" , ensureAuthenticated, ensureManager, async function(req,res) {
  var user = await User.findOne({_id: req.body.id})
  
  const role = {
    'admin': async () => {
      await User.updateOne({_id: req.body.id},{admin: !user.admin}),
      res.end()
    },
    'manager': async () => {
      await User.updateOne({_id: req.body.id},{manager: !user.manager}),
      res.end()
    }
  }

  if(user.id !== owner.id) {
    if(req.user.id !== user.id) {
      role[req.body.role]()
    } else {
      return
    }
  } else {
  }
})

app.post("/editbook", ensureAuthenticated, ensureManager, async function (req,res) {
  newcount = Number(req.body.count);
  bodyavailable = Number(req.body.bookavailable);
  bodycount = Number(req.body.bookcount);
  available = ""
  if(newcount > bodycount) {
    available = bodyavailable + (newcount - bodycount)
  } else if (newcount < bodycount) {
    available = bodyavailable - (bodycount - newcount)
  } else if (newcount == bodycount) {
    available = bodyavailable;
  }

  if(available != "") {
    await Book.updateOne({_id:req.body.bookid},{
      name: req.body.name,
      author:req.body.author,
      genre: req.body.genre,
      publisher: req.body.publisher,
      ISBN: req.body.ISBN,
      count: req.body.count,
      available: available,
      updated_at: Date.now(),
      updated_by: req.user.username
    }).then(
      req.flash('success','Erfolgreich!'),
      res.redirect('/book/'+req.body.bookid)
    ).catch(err => {
      req.flash('errormsg','Das hat nicht geklappt. Bitte versuche es später erneut.');
      res.redirect('/book/'+req.body.bookid);
    })
  } else {
    req.flash('errormsg','Das hat nicht geklappt. Bitte versuche es später erneut.');
    res.redirect('/book/'+req.body.bookid);
  }
});

app.post("/upload", ensureAuthenticated, ensureManager, async function (req, res) {
  console.log("\x1b[32m","[app] POST: /upload","\x1b[0m");
  if (req.files) {
    if (req.user.userimg == "standard") {
      var img = req.files.changeusrimg
      var name = img.name;
      name = name.substring(name.length-3,name.length).toLowerCase()
      if(name == "png" || name == "jpg" || name == "gif") {
      id = createid(16)
      file = req.files.changeusrimg
      file.mv("./public/resources/userimg/" + id + ".png").then(
          await User.updateOne(
            { _id: req.user.id },
            { $set: {userimg: id} },
            function (err) {
              if (err) {
                console.log(err)
              } else {
              }
            }
          )
        ).catch(err => {
          console.error(err)
        })
        req.flash('success','Profilbild erfolgreich geändert.');
        res.redirect("/settings")
      } else {
        req.flash('error','Wir unterstützen ausschließlich PNG, JPG oder GIF Bilder.');
        res.redirect('/settings');
      }
    } else {
      var img = req.files.changeusrimg
      var name = img.name;
      name = name.substring(name.length-3,name.length).toLowerCase()
      if(name == "png" || name == "jpg" || name == "gif") {
      fs.unlink("./public/resources/userimg/" + req.user.userimg + ".png", (err) => {
        if (err) {
          console.log("Error trying to delete img:"+id+".png")
        } 
      })
      id = createid(16)
      file = req.files.changeusrimg
        file.mv("./public/resources/userimg/" + id + ".png").then(
          await User.updateOne(
            { _id: req.user.id },
            { userimg: id },
            function (err) {
              if (err) {
                console.log(err)
              } else {
              }
            }
          )
        ).catch(err => {
          console.error(err)
        })
        req.flash('success','Profilbild erfolgreich geändert.');
        res.redirect("/settings");
      } else {
        req.flash('error','Wir unterstützen ausschließlich PNG, JPG oder GIF Bilder');
        res.redirect('/settings');
      }
    }
  } else {
    res.redirect('/settings');
  }
});
////
app.get('/success', function (req, res) {
  console.log("\x1b[32m","[app] GET: /success","\x1b[0m");
  res.render('success', {
    title:"Erfolgreich registriert - GT-DB",
    layout: false,
    msg: req.flash('message')
  });
});

app.get("/getbdata/id=:id", ensureAuthenticated, ensureManager, async function(req,res) {
  console.log("\x1b[32m","[app] GET: /getbdata/id=" + req.params.id,"\x1b[0m");
  var book = await Book.findById(req.params.id)
  res.render("./bdata/bdata1", { layout: "./layouts/layout_empty.ejs", book: book });
});

app.get("/getbdatahistory/id=:id", ensureAuthenticated, ensureManager, async function(req,res) {
  console.log("\x1b[32m","[app] GET: /getbdatahistory/id="+req.params.id,"\x1b[0m");
  var bhistory = await BookHistory.find({ bookid: req.params.id });
  res.render('./bdata/bdata3', { layout: './layouts/layout_empty.ejs',bhistory:bhistory })
});

app.get("/getbdataform/id=:id", ensureAuthenticated, ensureManager, async function (req, res) {
  date = Date.now();
  date = new Date(date);
  date = formatDate(date);
  console.log("\x1b[32m","[app] GET: /getbdataform/id=" + req.params.id,"\x1b[0m");
  var book = await Book.findById(req.params.id);
  res.render("./bdata/bdata2", { layout: "./layouts/layout_empty.ejs", book: book,date:date });
});

//500 error handling
app.use(function(error,req,res,next) {
  console.log(error)
  next()
})

// 404 error handling
app.use(function(req, res) {
  console.log(res.statusCode)
  res.status(404).redirect('/')
});

async function protectOwnership() {
  owner = await User.findOne({username: "julius.niedermauntel"})
}

//receiving/sending data (socket.io)
io.on("connect", function (socket) {
  date = Date.now();
  date = new Date(date);
  console.log("[" + date.toDateString()+ ', ' + new Date().toTimeString().slice(0, 8) + "]" + " Connected to client.");
  socket.on("join", function (room) {
    socket.join(room);
    console.log("Added client to room:", room);
  });
});

function start() {
  connectdb(async function (err) {
    if(err) {
      start()
    } else {
      await startupcheck();
      protectOwnership();
      server.listen(port, (error) => {
        if (error) {
          console.error(error);
        } else {
          console.log("Listening on port: " + port + ".");
        }
      });
    }
  });
};

async function startupcheck() {
  console.log("Looking for books that are expired/expiring soon.")
  expired = await getexprd();
  expiringsoon = await getexpsoon();
  console.log("Done.")
};

start();

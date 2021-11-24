const mongoose = require('mongoose')
const User = require('./models/user')
const Book = require("./models/book")
const BookHistory = require('./models/bookhistory')
const dotenv = require("dotenv")
dotenv.config()

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

var url = 'mongodb://'+process.env.DBUSER+':'+process.env.DBPASSWORDLOCAL+'@'+process.env.IPADDRESS+':27017/gt-db?authSource=admin'
//var url = 'mongodb://100.10.1.1:27017/'
async function connectdb(callback) {
    console.log('Connecting to database...')
    try {
        await mongoose.connect(url, {useUnifiedTopology: true, useNewUrlParser: true })
            .then(() => console.log('Successfully connected to database.'))
        callback(null)
    }
    catch (err) {
        console.log(err)
        console.log('Connection failed. Retrying.')
        await sleep(5000)
        callback(err)
    }
}

async function getAllBooks() {
  var books = await Book.find()
  return books
}

async function getAllUsers() {
  var users = await User.find()
  return users
}

function updatedate(date) {
  var dateoc = Date.now()
  dateoc = new Date(dateoc)
  dateoc = formatDate(dateoc)
  var date = date
  var date0 = date.substring(5,15)
  date = date0 +" - "+dateoc
  return date
}

async function getexpsoon() {
  var date = Date.now() + (1000*60*60*24*4) //look for books expiring in next 4 days
  var docs = await BookHistory.find({ expiring_at: { $gt: Date.now(), $lt: date } })
  //for(let i=0i<docs.lengthi++) {
  //  b_names.push(docs[i].bname)
  //}
  //console.log(b_names.length)

  const promises = docs.map(async book => {
    //console.log(book)
    //const book = await Book.findOne({_id:id})
    return {name: book.bname,id: book.bookid, exp: book.expiring_at}
  })
  
  return Promise.all(promises)
}

async function getexprd() {
  var datenow = Date.now()
  var docs = await BookHistory.find({ expiring_at: { $lt: datenow, $gt:0 } })
  //for(let i=0;i<docs.length;i++) {
  //  b_names.push(docs[i].bname)
  //}
  //console.log(b_names.length)

  const promises = docs.map(async book => {
    //console.log(book)
    //const book = await Book.findOne({_id:id})
    return {name: book.bname,id: book.bookid, exp: book.expiring_at}
  })
  
  return Promise.all(promises)
  //return b_names
}

function createid(len) {
  var result = ""
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  var charactersLength = characters.length
  for (var i = 0 ; i < len; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    //console.log("logged in ")
    return next()
  }
  if(req.method == "GET") {
    req.session.dest = req.url
  }
  req.flash('error','noauth')
  res.redirect("/")
}

function ensureManager(req, res, next) {
  if (req.user.manager === true) {
    return next()
  } else {
  req.logout()
  req.flash('error','access denied')
  res.redirect('/')
  }
}

function ensureAdmin(req, res, next) {
  if (req.user.admin === true) {
    return next()
  } else {
    res.end()
  }
}

async function userExists(usermail) {
  var useremail = usermail.toLowerCase()
  console.log("Checking for mail: ", useremail)
  await User.findOne({ email: useremail }).then(function (docs) {
    if (!docs) {
      return false
    } else {
      return true
    }
  })
}

function aufdroeselisierung(mail) {
  var mail = mail.toLowerCase()
  var name
  var username
  var firstname
  var lastname
  var userdetailsstring
  var userdetails = mail.split("@")
  userdetails.remove(1)
  username = userdetails
  //console.log(username)
  userdetailsstring = userdetails.toString()
  username = userdetailsstring.toLowerCase()
  name = userdetailsstring.split(".")
  firstname = name[0]
  lastname = name[1]
  //console.log(firstname, lastname)
  firstname = firstname[0].toUpperCase() + firstname.substring(1)
  lastname = lastname[0].toUpperCase() + lastname.substring(1)
  //console.log(firstname,lastname)
  name[0] = firstname
  name[1] = lastname
  name[2] = username
  return name
}

function mailvalidation(mail,req) {
  var mailat = mail.split("@")
  if (mail.includes("@gym-trittau.de") && mailat[0].includes(".")) {
    return true
  }
  return false
}

function formatDate(date) {
  var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear()

  if (month.length < 2)
    month = '0' + month
  if (day.length < 2)
    day = '0' + day

  return [day,month,year].join('.')
}

function sortName(a,b) {
  let xa = a.name.toLowerCase()
  let xb = b.name.toLowerCase()

  if (xa < xb) {
      return -1
  }
  if (xa > xb) {
      return 1
  }
  return 0
}

function sortGenre(a,b) {
  let xa = a.genre.toLowerCase()
  let xb = b.genre.toLowerCase()

  if (xa < xb) {
      return -1
  }
  if (xa > xb) {
      return 1
  }
  return 0
}

function sortAuthor(a,b) {
  let xa = a.author.toLowerCase()
  let xb = b.author.toLowerCase()

  if (xa < xb) {
      return -1
  }
  if (xa > xb) {
      return 1
  }
  return 0
}

function sortPublisher(a,b) {
  let xa = a.publisher.toLowerCase()
  let xb = b.publisher.toLowerCase()

  if (xa < xb) {
      return -1
  }
  if (xa > xb) {
      return 1
  }
  return 0
}

function sortISBN(a,b) {
  let xa = a.ISBN.toLowerCase()
  let xb = b.ISBN.toLowerCase()

  if (xa < xb) {
      return -1
  }
  if (xa > xb) {
      return 1
  }
  return 0
}

async function updatebookhiring(bid) {
  var book = await Book.findById(bid)
  var available = book.available
  var available = available + 1
  await Book.updateOne(
    { _id: bid },
    {available: available}
  )
}

async function updatebhistory(bhistory,id,req) {
  var updateddate = updatedate(bhistory.date)
  await BookHistory.updateOne(
    { _id: id },
    { date: updateddate, closed_at: Date.now(), closed_by: req.user.username, expiring_at: "0" })
}

async function searchbookbyid(params) {
  var book = await Book.findById(params)
  return book
}

async function userExists(usermail) {
  var useremail = usermail.toLowerCase()
  console.log("Checking for mail: ", useremail)
  return Boolean(await User.findOne({ email: useremail }))
}

// Array Remove - By John Resig (MIT Licensed)
Array.prototype.remove = function (from, to) {
  var rest = this.slice((to || from) + 1 || this.length)
  this.length = from < 0 ? this.length + from : from
  return this.push.apply(this, rest)
}

exports.connectdb = connectdb
exports.getAllBooks = getAllBooks
exports.updatedate = updatedate
exports.getexpsoon = getexpsoon
exports.getexprd = getexprd
exports.createid = createid
exports.userExists = userExists
exports.aufdroeselisierung = aufdroeselisierung
exports.mailvalidation = mailvalidation
exports.formatDate = formatDate
exports.ensureAuthenticated = ensureAuthenticated
exports.ensureManager = ensureManager
exports.ensureAdmin = ensureAdmin
exports.getAllUsers = getAllUsers
exports.userExists = userExists
exports.sortName = sortName
exports.sortGenre = sortGenre
exports.sortAuthor = sortAuthor
exports.sortPublisher = sortPublisher
exports.sortISBN = sortISBN
exports.updatebookhiring = updatebookhiring
exports.updatebhistory = updatebhistory
exports.searchbookbyid = searchbookbyid

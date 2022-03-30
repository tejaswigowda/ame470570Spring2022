const md5 = require("md5");
var url = require("url"),
	querystring = require("querystring");
var passport = require('passport');
var fs = require('fs');
	var dbURL = 'mongodb://127.0.0.1:27017/rssReader';
var path = require('path'),
  express = require('express'),
  db = require('mongoskin').db(dbURL);
  var Client = require('node-rest-client').Client;
var client = new Client();

var mongoose = require('mongoose');
mongoose.connect(dbURL); // connect to our database

var app = express();
var secret = 'test' + new Date().getTime().toString()

var session = require('express-session');
app.use(require("cookie-parser")(secret));
var MongoStore = require('connect-mongo')(session);
app.use(session( {store: new MongoStore({
   url: dbURL,
   secret: secret
})}));
app.use(passport.initialize());
app.use(passport.session());
var flash = require('express-flash');
app.use( flash() );

var bodyParser = require("body-parser");
var methodOverride = require("method-override");

app.use(methodOverride());
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended:false
}));
require('./passport/config/passport')(passport); // pass passport for configuration
require('./passport/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

app.get("/addFeed", function (req, res) {
  var url = req.query.url;
  var obj = {
    time: new Date().getTime(),
    url: url,
    userid: req.user.local.email,
    id: md5(req.user.local.email +  new Date().getTime().toString()),
    name: "Untitled"
  }

  db.collection("data").insert(obj, function(e,r){
    res.send("1");
  });
});

app.get("/deleteFeed", function (req, res) {
  var id = req.query.id;
  db.collection("data").remove({id:id}, function(e,r){
      res.send("1");
  });
});


app.get("/editFeed", function (req, res) {
  var id = req.query.id;
  var newName = req.query.newName;
  db.collection("data").findOne({id:id}, function(e,r){
    console.log(r);
    r.name = newName;
    db.collection("data").save(r, function(e1,r1){
      res.send("1");
    });
  });
});

app.get("/getAllFeeds", function (req, res) {
  db.collection("data").find({userid:req.user.local.email}).toArray(function(e,r){
    res.send(JSON.stringify(r))
  });
});

app.get("/makeHTTPReq", function (req, res) {
  var url = req.query.url;
  client.get(url, function (data, response) {
    // parsed response body as js object
    console.log(data);
    res.send(data);
  });
});


app.use(express.static(path.join(__dirname, 'public')));
//app.listen(8080);
if (require.main === module) { app.listen(8080); }
else{ module.exports = app; }

console.log("server running at http://localhost:8080")

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.send('noauth');
}


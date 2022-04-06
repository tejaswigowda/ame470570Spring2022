var fs = require('fs');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./credentials.json');
var s3 = new AWS.S3();

var express = require("express");
var app = express();
var bodyParser = require('body-parser');

var errorHandler = require('errorhandler');
var methodOverride = require('method-override');
var hostname = process.env.HOSTNAME || 'localhost';
var port = 8080;
app.use(methodOverride());
app.use(bodyParser());
//app.use(require('connect').bodyParser());


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(express.static(__dirname + '/public'));
app.use(errorHandler());


const md5 = require("md5");
var url = require("url"),
	querystring = require("querystring");
var passport = require('passport');
	var dbURL = 'mongodb://127.0.0.1:27017/imageApp';
var path = require('path'),
  db = require('mongoskin').db(dbURL);
  var Client = require('node-rest-client').Client;
var client = new Client();

var mongoose = require('mongoose');
mongoose.connect(dbURL); // connect to our database

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


app.post('/uploadFile', function(req, res){
    var intname = req.body.fileInput;
    console.log(intname);
    var filename = req.files.input.name;
    var fileType =  req.files.input.type;
    var tmpPath = req.files.input.path;
    var s3Path = '/' + intname;
    
    fs.readFile(tmpPath, function (err, data) {
        var params = {
            Bucket:'bucket470570',
            ACL:'public-read',
            Key:intname,
            Body: data,
            ServerSideEncryption : 'AES256'
        };
        s3.putObject(params, function(err, data) {
            res.end("success");
            console.log(err);
        });
    });
});

app.get("/getAllImages", function (req, res) {
  db.collection("images").find({userid:req.user.local.email}).toArray(function(e,r){
    res.send(JSON.stringify(r))
  });
});

app.get("/getAccountInfo", function (req, res) {
  db.collection("account").findOne({userid:req.user.local.email}, function(e,r){
    res.end(JSON.stringify(r));
  });
});




app.get("/updateFriends", function (req, res) {
  db.collection("account").findOne({userid:req.user.local.email}, function(e,r){
    if(r){
      r.friends = req.query.list.split(",")
      r.fname = req.query.fname
      r.lname = req.query.lname
      db.collection("account").save(r, function(e1,r1){
        res.send("1");
      });
    }
    else{
      var obj = {
         userid: req.user.local.email,
         fname : req.query.fname,
         lname : req.query.lname,
         friends: req.query.list.split(",")
      }
      db.collection("account").insert(obj, function(e1,r1){
        res.send("1");
      });
    }
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


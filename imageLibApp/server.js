const md5 = require("md5");
var fs = require('fs');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./credentials.json');
var s3 = new AWS.S3();
var dbURL = 'mongodb://127.0.0.1:27017/imageApp';
var path = require('path');
var db = require('mongoskin').db(dbURL);
  var Client = require('node-rest-client').Client;
var client = new Client();

var mongoose = require('mongoose');
mongoose.connect(dbURL); // connect to our database

var express = require("express");
var app = express();
var bodyParser = require('body-parser');

var errorHandler = require('errorhandler');
var methodOverride = require('method-override');
var hostname = process.env.HOSTNAME || 'localhost';
var passport = require('passport');
var port = 8080;
var secret = 'test' + new Date().getTime().toString()

var session = require('express-session');
app.use(require("cookie-parser")(secret));
var MongoStore = require('connect-mongo')(session);
app.use(session( {store: new MongoStore({
   url: dbURL,
   secret: secret
})}));

app.use(methodOverride());
//app.use(bodyParser());
app.use(require('connect').bodyParser());


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.use(express.static(__dirname + '/public'));
app.use(errorHandler());
app.use(passport.initialize());
app.use(passport.session());
var flash = require('express-flash');
app.use( flash() );

require('./passport/config/passport')(passport); // pass passport for configuration
require('./passport/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport


app.get("/", function (req, res) {
      res.redirect("/index.html");
});

app.post('/uploadFile', function(req, res){
    var intname = req.body.fileInput;
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
              var obj = {
                time: new Date().getTime(),
                url: intname,
                userid: req.user.local.email,
                filter: 'none',
                id: md5(req.user.local.email +  new Date().getTime().toString()),
                name: "Untitled"
              }

            db.collection("images").insert(obj, function(e,r){
              res.send("1");
            });
        });
    });
});


app.get("/getAllImages", function (req, res) {
  db.collection("images").find({userid:req.user.local.email}).toArray(function(e,r){
    res.send(JSON.stringify(r))
  });
});

app.get("/getDashboardList", function (req, res) {
  var skip = parseInt(req.query.skip || "0");
  db.collection("account").findOne({userid:req.user.local.email}, function(e,r){
    db.collection("images").find({userid:{$in:r.friends}}).skip(skip).limit(10).toArray(function(e1,r1){
      res.send(JSON.stringify(r1));
    });
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


app.get("/postChat", function (req, res) {
  db.collection("chat").insert(req.query, function(e,r){
    res.send("1");
  });
});


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

app.get("/deleteImage", function (req, res) {
  var id = req.query.id;
  db.collection("images").remove({id:id}, function(e,r){
      res.send("1");
  });
});


app.get("/editImage", function (req, res) {
  var id = req.query.id;
  var newname= req.query.newName;
  db.collection("images").findOne({id:id}, function(e,r){
    console.log(r);
    r.name= newname;
    db.collection("images").save(r, function(e1,r1){
      res.send("1");
    });
  });
});


app.get("/changeFilter", function (req, res) {
  var id = req.query.id;
  var newfil = req.query.filter;
  db.collection("images").findOne({id:id}, function(e,r){
    console.log(r);
    r.filter = newfil;
    db.collection("images").save(r, function(e1,r1){
      res.send("1");
    });
  });
});

app.get("/getAllFeeds", function (req, res) {
  db.collection("data").find({userid:req.user.local.email}).toArray(function(e,r){
    res.send(JSON.stringify(r))
  });
});


app.get("/getLatestChat", function (req, res) {
  var chatid = req.query.chatid;
  db.collection("chat").find({chatid:chatid}).sort({time:-1}).limit(10).toArray(function(e,r){
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


console.log("Simple static server listening at http://" + hostname + ":" + port);
//app.listen(port);
// DO NOT DO app.listen() unless we're testing this directly
if (require.main === module) { app.listen(8080); }
// Instead do export the app:
else{ module.exports = app; }

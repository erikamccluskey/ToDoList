const mongoose = require("mongoose");

// connect mongoose to a database called testdb
mongoose.connect("mongodb://localhost:27017/testdb", 
                {useNewUrlParser: true, 
                 useUnifiedTopology: true});


const fs = require('fs');

const express = require('express');
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public')); //for css

const port = 3000;
app.listen(port, function(){
  console.log("server is running on port " + port);
});

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const db = require("mongodb");

require("dotenv").config();

app.use(session({
  secret: process.env.SECRET, // stores our secret in our .env file
  resave: false,              // other config settings explained in the docs
  saveUninitialized: false
}));

// set up passport
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');
          
const userSchema = new mongoose.Schema
({
  username: String,
  password: String
})


// configure passportLocalMongoose
userSchema.plugin(passportLocalMongoose);

// collection of users
const User = new mongoose.model("User", userSchema);

// more passport-local-mongoose config
// create a strategy for storing users with Passport
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


const taskSchema = new mongoose.Schema
({
  _id:Number,
  name: String,
  owner: userSchema,
  creator: userSchema,
  done: Boolean,
  cleared: Boolean
})

// collection of tasks
var task = mongoose.model("task", taskSchema);

app.get('/', function(req, res){
  res.render('login');
});

app.post("/login", function(req, res) {
  console.log("A user is logging in")
  // create a user
  const user = new User ({
      username: req.body.username,
      password: req.body.password
   });
   // try to log them in
  req.login (user, function(err) {
      if (err) {
          // failure
          console.log(err);
          res.redirect("/")
      } else {
          // success
          // authenticate using passport-local
          passport.authenticate("local")(req, res, function() {
              res.redirect(307, "/todo"); 
          });
      }
  });
});

app.post("/register", function(req, res) {

  const authenticationCode = 1234;

  console.log("Registering a new user");
  // calls a passport-local-mongoose function for registering new users
  // expect an error if the user already exists!
  if (req.body.authentication != authenticationCode)
  {
    res.redirect('/');
  }
  else
  {
  User.register({username: req.body.username}, req.body.password, function(err, user){
      if (err) {
          console.log(err);
          res.redirect("/")
      } else {
          // authenticate using passport-local
          // what is this double function syntax?! It's called currying.
          passport.authenticate("local")(req, res, function(){
              res.redirect(307, "/todo")
          });
      }
  });
}
});


app.post('/todo', function(req, res)
{
const taskLists = [];

task.find({}, (err, tasks) => {
  if (err) {
      console.log(err);
  } else {
      tasks.forEach((task) => {
          taskLists.push(task);
      })
  }
  res.render('todolist', {taskList: taskLists, username: req.user.username});  
});  
});


app.post('/addTask', function(req, res){
    var currentUser = req.user;

  task.create({
    _id: (req.body.length++),
    name: req.body.newTask,
    owner: undefined,
    creator: currentUser,
    done: false,
    cleared: false
  }, function(){
    res.redirect(307, '/todo');
  });
});

app.post('/claim', function(req, res){
  var taskId = req.body._id;
  var currentUser = req.user;

  task.findByIdAndUpdate(taskId--, {'owner': currentUser}, function(){
    res.redirect(307, '/todo');
  })
});

app.post('/abandonorcomplete', function(req, res)
{
mongoose.set('useFindAndModify', false);

var taskId = req.body._id;

if (req.body.complete === "on"){
task.findByIdAndUpdate(taskId--, {'done': 'true'}, function(){
  res.redirect(307, '/todo');
})
}

else
{
  task.findByIdAndUpdate(taskId--, {owner: undefined}, function(){
    res.redirect(307, '/todo');
  })
}

});

app.post('/unfinish', function(req, res){
  var taskId = req.body._id;

  task.findByIdAndUpdate(taskId--, {'done': 'false'}, function(){
    res.redirect(307, '/todo');
});
});

app.post('/purge', function(req, res)
{
task.updateMany({'done': 'true'}, {'cleared' : 'true'}, function(){
  res.redirect(307, '/todo');
})  
});

app.get("/logout", function(req, res){
  console.log("A user logged out")
  req.logout();
  res.redirect("/");
})
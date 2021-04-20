//jshint esversion:6/
                       //REQUIRING MODULES //

require('dotenv').config(); //Has to be first
const express = require("express");// (app.) framework that let's you structure a web application to handle multiple different http requests at a specific url
const bodyParser = require("body-parser");//(req,res)body parsing middleware. It is responsible for parsing the incoming request bodies in a middleware before you handle it
const ejs = require("ejs");//a simple templating language that lets you generate HTML markup with plain JavaScript
const mongoose = require("mongoose");//Mongoose is an Object Data Modeling (ODM) library for MongoDB and Node. js. It manages relationships between data, provides schema validation, and is used to translate between objects in code and the representation of those objects in MongoDB.
const session = require("express-session");//Storing session data,also offers ways to secure your cookies.
const passport = require("passport");//Passport is Express-compatible authentication middleware for Node.js.Passport's sole purpose is to authenticate requests, which it does through an extensible set of plugins known as strategies
const passportLocalMongoose = require("passport-local-mongoose");//Passport-Local Mongoose is a Mongoose plugin that simplifies building username and password login with Passport.//
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");// This package allows google passport to find or create user//
const FacebookStrategy = require("passport-facebook").Strategy;
                       // CONNECTING TO MODULES//

                       
const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true,useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);
app.use(session({
    secret: "Our little secret",             //This is the secret used to sign the session ID cookie. This can be either a string for a single secret, or an array of multiple secrets.
    resave: false,                           // Forces the session to be saved back to the session store, even if the session was never modified during the request.
    saveUninitialized: false                 // Forces a session that is "uninitialized" to be saved to the store.Choosing false is useful for implementing login sessions, reducing server storage usage, or complying with laws that require permission before setting a cookie. //
                                                                
}));
app.use(passport.initialize());
app.use(passport.session());


              //CREATING DATABASE WITH MONGOOSE//
         

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,  //Our mongoose db will check the google id and if it exits, user will log in without mongoose creating a new user db.//
    secret: String,
    facebookId: String,
});
//Email needed to be identified as the username so mongodb wont create another user.
userSchema.plugin(passportLocalMongoose, {emailField: "username"});
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
//only the user ID is serialized to the session, keeping the amount of data stored within the session small.//
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  //When subsequent requests are received, this ID is used to find the user, which will be restored to req.user//
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

                             // USING GOOGLE OAUTH //

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
                            //USING FACEBOOK OAUTH//

   passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));                         

                             //GET REQUESTS TO ROUTES//



app.get("/", function (req, res) {
    res.render("home")
});

app.get("/auth/google", passport.authenticate("google", {
    scope: ["profile"]
}));

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect secrets page.
    res.redirect("/secrets");
      });

  
app.get("/auth/facebook",
    passport.authenticate("facebook",{ scope: 'public_profile'})//important to set permission scope, otherwise facebook login won't work
    );

app.get("/auth/facebook/secrets",
    passport.authenticate("facebook", { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/secrets");
        });
    

app.get("/login", function (req, res) {
    res.render("login")
});

app.get("/register", function (req, res) {
    res.render("register")
});

app.get("/secrets", function (req, res) {
    //($ne:null) is a mongo query for "not equal to null"
    User.find({ "secret": {$ne: null}}, function (err, foundUsers) { 
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", { usersWithSecrets: foundUsers });
            }
        }
    });
});


app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});


app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});


                       // POST REQUESTS//

app.post("/register", function (req, res) {

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            } )
        };
    })
  
});

app.post("/login", function (req, res) {
  
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id, function (err, foundUser) {
        if (err) {
            console.log(err)
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets");
                });
            }
        }
    });
});
                    //LOCAL SERVER CONNECTION//

app.listen(3000, function () {
    console.log("Server is running on port 3000")
});




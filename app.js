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
    password: String
});

userSchema.plugin(passportLocalMongoose);// This is what we'll use to hash and salt our passwords and save the users into mongodb database//


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
// Only necessary when we're using sessions//
passport.serializeUser(User.serializeUser());// creates a cookie and stuffs users info inside the cookie//
passport.deserializeUser(User.deserializeUser());// allows passport to crumble the cookie and discover the msg inside, like who the user is and authenticate that user.//



                             //GET REQUESTS TO ROUTES//



app.get("/", function (req, res) {
    res.render("home")
});

app.get("/login", function (req, res) {
    res.render("login")
});

app.get("/register", function (req, res) {
    res.render("register")
});

app.get("/secrets", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    };
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






                    //LOCAL SERVER CONNECTION//

app.listen(3000, function () {
    console.log("Server is running on port 3000")
});
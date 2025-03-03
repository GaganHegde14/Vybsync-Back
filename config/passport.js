require("dotenv").config();

const passport = require("passport"); // Add this line
const session = require("express-session");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/api/user/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // console.log("Access Token:", accessToken);
        // console.log("Refresh Token:", refreshToken);
        // console.log("Google Profile:", profile);

        // Extract email from the profile
        const email = profile.emails[0].value;

        // Check if user already exists in the database
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          return done(null, existingUser);
        }

        // Create a new user if they don't exist
        const newUser = await User.create({
          name: profile.displayName,
          email: email,
          picture: profile.photos[0].value,
          password: "google-auth",
        });

        done(null, newUser);
      } catch (err) {
        console.error("Error during Google OAuth:", err);
        done(err, null);
      }
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user.id); // Store user ID in session
});

passport.deserializeUser((id, done) => {
  // Fetch user from database using ID
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err));
});
module.exports = passport;

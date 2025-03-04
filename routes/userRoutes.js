const express = require("express");
require("dotenv").config();
const { protect } = require("../middlewares/authMiddleware");
const passport = require("passport");
const {
  registerUser,
  authUser,
  allUsers,
  updateProfile,
  getUserProfile,
} = require("../controllers/userControllers");
const generateToken = require("../utils/generateToken"); // Ensure it's imported

const router = express.Router();

// Existing routes
router.route("/").post(registerUser).get(protect, allUsers);
router.route("/login").post(authUser);

// New routes for profile management
router.route("/update").put(protect, updateProfile); // Update current user's profile
router.route("/:id").get(protect, getUserProfile); // Get a specific user's profile by ID

// Google OAuth routes
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["openid", "profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    if (!req.user) {
      return res.redirect("https://vybsync.vercel.app/login");
    }

    const token = generateToken(req.user._id);
    const redirectURL = `https://vybsync.vercel.app/Chathome?token=${token}`;
    res.redirect(redirectURL);
  }
);

module.exports = router;

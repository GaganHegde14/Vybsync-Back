const expressAsyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const generateToken = require("../config/generateToken");

// Register User
const registerUser = expressAsyncHandler(async (req, res) => {
  const { name, email, password, pic } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please enter all required fields");
  }

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  // Create new user
  const user = await User.create({ name, email, password, pic });

  if (user) {
    const token = generateToken(user._id);
    console.log("Generated Token (Register):", token);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Failed to create user");
  }
});

// Authenticate User (Login)
const authUser = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id);
    console.log("Generated Token (Login):", token);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      pic: user.pic,
      token,
    });
  } else {
    res.status(400);
    throw new Error("Invalid Credentials");
  }
});

// Get All Users (Search Users)
const allUsers = expressAsyncHandler(async (req, res) => {
  console.log("Received Query:", req.query);

  const keyword = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  console.log("Found Users:", users);

  res.send(users);
});

// Update User Profile
const updateProfile = expressAsyncHandler(async (req, res) => {
  const { name, email, bio } = req.body;

  console.log("Updating profile for user:", req.user._id, "with data:", {
    name,
    email,
    bio,
  });

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { name, email, bio },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updatedUser) {
    console.log("User not found for update:", req.user._id);
    res.status(404);
    throw new Error("User not found");
  }

  console.log("Profile updated successfully:", updatedUser);
  res.status(200).json(updatedUser);
});

// Get User Profile by ID
const getUserProfile = expressAsyncHandler(async (req, res) => {
  console.log("Fetching profile for user ID:", req.params.id);

  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    console.log("User not found:", req.params.id);
    res.status(404);
    throw new Error("User not found");
  }

  console.log("Profile fetched:", user);
  res.status(200).json(user);
});

module.exports = {
  registerUser,
  authUser,
  allUsers,
  updateProfile,
  getUserProfile,
};

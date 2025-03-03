const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");

// Access or create a one-on-one chat
const accessChat = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "UserId not provided" });
    }

    let chat = await Chat.findOne({
      isGroupChat: false,
      users: { $all: [req.user._id, userId] }, // Simplified query
    })
      .populate("users", "-password")
      .populate("latestMessage");

    if (chat) {
      chat = await User.populate(chat, {
        path: "latestMessage.sender",
        select: "name pic email",
      });
      return res.status(200).json(chat);
    }

    // If chat doesn't exist, create a new one
    const newChat = await Chat.create({
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    });

    const fullChat = await Chat.findById(newChat._id).populate(
      "users",
      "-password"
    );
    return res.status(201).json(fullChat);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error accessing chat", error: error.message });
  }
});

// Fetch all chats for the logged-in user
const fetchChats = asyncHandler(async (req, res) => {
  try {
    console.log("Fetching chats for user:", req.user._id); // Log the user ID

    let chats = await Chat.find({ users: req.user._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    console.log("Raw chats from DB:", chats); // Log the raw query result

    chats = await User.populate(chats, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    console.log("Populated chats:", chats); // Log the final result

    res.status(200).json(chats);
  } catch (error) {
    console.error("Error in fetchChats:", error); // Debugging line
    res
      .status(500)
      .json({ message: "Error fetching chats", error: error.message });
  }
});

// Create a new group chat
const createGroupChat = asyncHandler(async (req, res) => {
  try {
    const { users, name } = req.body;

    if (!users || !name) {
      return res
        .status(400)
        .json({ message: "Please provide a name and users" });
    }

    const parsedUsers = typeof users === "string" ? JSON.parse(users) : users;
    if (!Array.isArray(parsedUsers) || parsedUsers.length < 2) {
      return res
        .status(400)
        .json({ message: "At least 2 users are required for a group chat" });
    }

    parsedUsers.push(req.user);

    const groupChat = await Chat.create({
      chatName: name,
      users: parsedUsers,
      isGroupChat: true,
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findById(groupChat._id)
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(201).json(fullGroupChat);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating group chat", error: error.message });
  }
});

// Rename a group chat
const renameGroup = asyncHandler(async (req, res) => {
  try {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!updatedChat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    res.status(200).json(updatedChat);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error renaming group", error: error.message });
  }
});

// Remove a user from a group
const removeFromGroup = asyncHandler(async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    // Only group admin can remove users
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admins can remove users" });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(updatedChat);
  } catch (error) {
    res.status(500).json({
      message: "Error removing user from group",
      error: error.message,
    });
  }
});

// Add a user to a group
const addToGroup = asyncHandler(async (req, res) => {
  try {
    const { chatId, userId } = req.body;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    // Only group admin can add users
    if (chat.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only admins can add users" });
    }

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(updatedChat);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error adding user to group", error: error.message });
  }
});
const updateChatSection = asyncHandler(async (req, res) => {
  const { chatId, section } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    { section },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage");

  if (!updatedChat) {
    return res.status(404).json({ message: "Chat not found" });
  }

  res.status(200).json(updatedChat);
});
module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  updateChatSection,
};

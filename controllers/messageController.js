const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

const allMessages = asyncHandler(async (req, res) => {
  try {
    const chatId = req.params.chatId;
    console.log("Fetching messages for chatId:", chatId);
    if (!chatId) {
      return res.status(400).json({ message: "Chat ID is required" });
    }

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "name pic email")
      .populate("chat");

    // Mark messages as seen for the current user
    await Message.updateMany(
      { chat: chatId, seen: false },
      { $set: { seen: true } }
    );

    console.log("Messages fetched:", messages);
    res.json(messages);
  } catch (error) {
    console.error("Error in allMessages:", error);
    res
      .status(400)
      .json({ message: error.message || "Failed to fetch messages" });
  }
});

const sendMessage = asyncHandler(async (req, res, io) => {
  const { content, chatId } = req.body;

  if (!content || !chatId) {
    return res.status(400).json({ message: "Invalid data" });
  }

  console.log("Sending message - User ID from token:", req.user._id);

  let message = await Message.create({
    sender: req.user._id,
    content,
    chat: chatId,
    seen: false, // Default to unseen
  });

  console.log(
    "Created message - ID:",
    message._id,
    "Sender:",
    message.sender.toString()
  );

  message = await message.populate("sender", "name pic email");
  message = await message.populate("chat");
  message = await User.populate(message, {
    path: "chat.users",
    select: "name pic email",
  });

  await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

  io.to(chatId).emit("messageReceived", message);

  res.json(message);
});

const deleteMessage = asyncHandler(async (req, res, io) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) {
    return res.status(404).json({ message: "Message not found" });
  }

  console.log("Delete attempt - Message ID:", message._id);
  console.log("Delete attempt - Message Sender:", message.sender.toString());
  console.log("Delete attempt - Request User ID:", req.user._id.toString());

  const senderId = message.sender.toString();
  const userId = req.user._id.toString();

  if (senderId !== userId) {
    console.log("Mismatch detected - Sender:", senderId, "!= User:", userId);
    return res
      .status(403)
      .json({ message: "You can only delete your own messages" });
  }

  await Message.findByIdAndDelete(messageId);

  const chat = await Chat.findById(message.chat);
  if (chat.latestMessage && chat.latestMessage.toString() === messageId) {
    const latest = await Message.findOne({ chat: chat._id })
      .sort({ createdAt: -1 })
      .populate("sender", "name pic email");
    chat.latestMessage = latest ? latest._id : null;
    await chat.save();
  }

  io.to(message.chat.toString()).emit("messageDeleted", { messageId });
  res.json({ message: "Message deleted" });
});

module.exports = { allMessages, sendMessage, deleteMessage };

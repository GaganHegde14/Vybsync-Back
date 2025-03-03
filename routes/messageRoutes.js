const express = require("express");
const {
  allMessages,
  sendMessage,
  deleteMessage,
} = require("../controllers/messageController");
const { protect } = require("../middlewares/authMiddleware");

module.exports = (io) => {
  const router = express.Router();

  router.route("/:chatId").get(protect, allMessages);
  router.route("/").post(protect, (req, res) => sendMessage(req, res, io));
  router
    .route("/:messageId")
    .delete(protect, (req, res) => deleteMessage(req, res, io));

  return router;
};

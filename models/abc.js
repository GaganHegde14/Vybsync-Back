const mongoose = require("mongoose");
const Chat = require("./models/chatModel");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrateChats = async () => {
  try {
    await Chat.updateMany(
      { section: { $exists: false } },
      { $set: { section: "home" } }
    );
    console.log("Migration complete");
    mongoose.connection.close();
  } catch (err) {
    console.error("Migration error:", err);
  }
};

migrateChats();

const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const app = express();
const PORT = 3000;

// Cloudinary Configuration
cloudinary.config({
  cloud_name: "drxvftof4",
  api_key: "872961783425164",
  api_secret: "KWEJ6SbPybty7YefACspZ-j-ym0",
});
console.log("✅ Cloudinary Connected");

// MongoDB Connection
mongoose.connect("mongodb+srv://user1:malafiki@leodb.5mf7q.mongodb.net/mediaz?retryWrites=true&w=majority&appName=leodb")
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Connection error:", err));

// Schemas
const AdminSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
});

const MediaSchema = new mongoose.Schema({
  url: String, 
  publicId: String, 
  type: String, 
  caption: String,
  likes: { type: Number, default: 0 },
  uploadTime: { type: Date, default: Date.now },
});

// Models
const Admin = mongoose.model("Admin", AdminSchema);
const Media = mongoose.model("Media", MediaSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: "secret-key",
  resave: false,
  saveUninitialized: true,
}));

// Cloudinary Storage Configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const folder = "uploads";
    const resourceType = file.mimetype.startsWith("image") ? "image" : "video";
    return {
      folder: folder,
      format: file.mimetype.split("/")[1],
      resource_type: resourceType,
      public_id: Date.now() + "-" + file.originalname.split(".")[0],
    };
  },
});

const upload = multer({ storage });

// Admin Routes
// Admin login, register, and other related functionalities here (same as your previous setup)

// Media Routes
// Upload Media
app.post("/media/upload", upload.single("file"), async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).send("❌ Unauthorized");
  }

  const { caption, type } = req.body;
  const mediaData = {
    url: req.file.path,
    publicId: req.file.filename,
    type: type, 
    caption: caption || "",
  };

  const media = new Media(mediaData);
  await media.save();
  res.redirect("/admin.html");
});

// Get All Media
app.get("/media/all", async (req, res) => {
  const mediaItems = await Media.find().sort({ uploadTime: -1 });
  res.json(mediaItems);
});

// Like Media
app.post("/media/like/:id", async (req, res) => {
  const { id } = req.params;
  const media = await Media.findById(id);
  if (media) {
    media.likes += 1;
    await media.save();
    res.json({ likes: media.likes });
  } else {
    res.status(404).send("❌ Media not found");
  }
});

// Delete Media
app.delete("/media/delete/:id", async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).send("❌ Unauthorized");
  }

  const { id } = req.params;
  const media = await Media.findById(id);
  if (media) {
    await cloudinary.uploader.destroy(media.publicId);
    await media.remove();
    res.send("✅ Media deleted successfully");
  } else {
    res.status(404).send("❌ Media not found");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");
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
// Database Connection
mongoose.connect("mongodb+srv://user1:malafiki@leodb.5mf7q.mongodb.net/mediaz?retryWrites=true&w=majority&appName=leodb")
  .then(() => console.log("✅ MongoDB connected to mediaz"))
  .catch((err) => console.error("❌ Connection error:", err));

// Schemas
const AdminSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
});

const MediaSchema = new mongoose.Schema({
  url: String,         // Cloudinary URL
  publicId: String,    // For deletion
  type: String,        // 'image' or 'video'
  caption: String,
  likes: { type: Number, default: 0 },
  comments: [{ username: String, comment: String }],
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

// Admin Registration
app.post("/admin/register", async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.send("❌ Passwords do not match!");

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = new Admin({ fullName, email, password: hashedPassword });
  await admin.save();
  res.redirect("/login.html");
});

// Admin Login
app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return res.send("❌ Invalid credentials!");
  }

  req.session.admin = admin;
  res.redirect("/admin.html");
});

// Upload Media (Admin Only)
app.post("/media/upload", upload.single("file"), async (req, res) => {
  if (!req.session.admin) return res.send("❌ Unauthorized!");

  try {
    const type = req.file.mimetype.startsWith("image") ? "image" : "video";
    const newMedia = new Media({
      url: req.file.path,           // Cloudinary URL
      publicId: req.file.filename,  // Cloudinary Public ID for deletion
      type,
      caption: req.body.caption,
    });

    await newMedia.save();
    console.log("✅ Media uploaded:", newMedia.url);
    res.redirect("/admin.html");
  } catch (error) {
    console.error("❌ Upload failed:", error);
    res.status(500).send("Failed to upload media!");
  }
});

// Fetch All Media
app.get("/media/all", async (req, res) => {
  const media = await Media.find().sort({ uploadTime: -1 });
  res.json(media);
});

// Like Media
app.post("/media/like/:id", async (req, res) => {
  await Media.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
  res.send("👍 Liked!");
});

// Delete Media (Admin Only)
app.delete("/media/delete/:id", async (req, res) => {
  if (!req.session.admin) return res.send("❌ Unauthorized!");

  const media = await Media.findById(req.params.id);
  if (!media) return res.send("❌ Media not found!");

  try {
    await cloudinary.uploader.destroy(media.publicId);
    await Media.findByIdAndDelete(req.params.id);
    res.send("🗑️ Media deleted!");
  } catch (error) {
    console.error("❌ Failed to delete from Cloudinary:", error);
    res.status(500).send("❌ Failed to delete media!");
  }
});

// Admin Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login.html");
});

// Start Server
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

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
app.post("/media/upload", upload.single("media"), async (req, res) => {
  if (!req.session.admin) {
    return res.status(401).send("❌ Unauthorized");
  }

  const { caption, type } = req.body;
  const mediaData = {
    url: req.file.path,
    publicId: req.file.filename,
    type: type, // Either 'image' or 'video'
    caption: caption || "",
  };

  const media = new Media(mediaData);
  await media.save();
  res.redirect("/admin.html");
});

// Get All Media
app.get("/media/all", async (req, res) => {
  const mediaItems = await Media.find();
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

// Add Comment
app.post("/media/comment/:id", async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const media = await Media.findById(id);

  if (!media) {
    return res.status(404).send("❌ Media not found");
  }

  const comment = {
    username: "Guest", // You can adjust this to fetch a logged-in user's name if needed
    comment: text,
  };

  media.comments.push(comment);
  await media.save();
  res.json(media.comments);  // Send the updated comments back
});

// Get Comments for a Media Item
app.get("/media/comments/:id", async (req, res) => {
  const { id } = req.params;
  const media = await Media.findById(id);
  if (!media) {
    return res.status(404).send("❌ Media not found");
  }

  res.json(media.comments);  // Return the comments
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
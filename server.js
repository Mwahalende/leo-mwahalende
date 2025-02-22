/*
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const app = express();
const PORT = 3000;
const SECRET = "secret123";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/mediaApp", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Failed:", err));

// Cloudinary Configuration
cloudinary.config({
  cloud_name: "drxvftof4",
  api_key: "872961783425164",
  api_secret: "KWEJ6SbPybty7YefACspZ-j-ym0",
});

// Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "uploads",
    allowed_formats: ["jpg", "jpeg", "png", "mp4", "mov"],
  },
});

const upload = multer({ storage });

// Mongoose Schemas
const AdminSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  password: String,
});

const MediaSchema = new mongoose.Schema({
  url: String,
  type: String,
  uploadedBy: String,
  likes: { type: Number, default: 0 },
  comments: [{ user: String, text: String }],
  createdAt: { type: Date, default: Date.now },
});

const Admin = mongoose.model("Admin", AdminSchema);
const Media = mongoose.model("Media", MediaSchema);

// Admin Registration
app.post("/register", async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.json({ message: "Passwords do not match." });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newAdmin = new Admin({ fullName, email, password: hashedPassword });

  try {
    await newAdmin.save();
    res.json({ success: true, message: "Admin registered successfully!" });
  } catch (error) {
    res.json({ success: false, message: "Email already exists." });
  }
});

// Admin Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.json({ success: false, message: "Admin not found!" });

  const isValid = await bcrypt.compare(password, admin.password);
  if (!isValid) return res.json({ success: false, message: "Invalid password!" });

  const token = jwt.sign({ id: admin._id }, SECRET, { expiresIn: "1h" });
  res.json({ success: true, token, message: "Login successful!" });
});

// Upload Media
app.post("/upload", upload.single("file"), async (req, res) => {
  const { uploadedBy } = req.body;
  if (!req.file) return res.json({ message: "File upload failed!" });

  const newMedia = new Media({
    url: req.file.path,
    type: req.file.mimetype.includes("image") ? "image" : "video",
    uploadedBy,
  });

  await newMedia.save();
  res.json({ success: true, message: "Media uploaded successfully!" });
});

// Get Media for User & Admin
app.get("/media", async (req, res) => {
  const media = await Media.find().sort({ createdAt: -1 });
  res.json(media);
});

// Like Media
app.post("/like/:id", async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) return res.json({ success: false, message: "Media not found!" });

  media.likes += 1;
  await media.save();
  res.json({ success: true, likes: media.likes });
});

// Comment on Media
app.post("/comment/:id", async (req, res) => {
  const { user, text } = req.body;
  const media = await Media.findById(req.params.id);
  if (!media) return res.json({ success: false, message: "Media not found!" });

  media.comments.push({ user, text });
  await media.save();
  res.json({ success: true, message: "Comment added!" });
});

// Delete Media (Admin Only)
app.delete("/delete/:id", async (req, res) => {
  const media = await Media.findByIdAndDelete(req.params.id);
  if (!media) return res.json({ success: false, message: "Media not found!" });

  // Delete from Cloudinary
  const publicId = media.url.split("/").pop().split(".")[0];
  await cloudinary.uploader.destroy(publicId);

  res.json({ success: true, message: "Media deleted successfully!" });
});

// Serve HTML Files
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "public", "register.html")));

// Start Server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
*
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = 3000;

// Set up MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/mediaz", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Define Schemas
const AdminSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    password: String
});

const MediaSchema = new mongoose.Schema({
    filename: String,
    type: String,
    caption: String,
    likes: { type: Number, default: 0 },
    comments: [{ username: String, comment: String }],
    uploadTime: { type: Date, default: Date.now }  // Add a timestamp for when the media is uploaded
});

// Models
const Admin = mongoose.model("Admin", AdminSchema);
const Media = mongoose.model("Media", MediaSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(logger);
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
}));
// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Admin Registration
app.post("/admin/register", async (req, res) => {
    const { fullName, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.send("Passwords do not match!");

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
        return res.send("Invalid credentials!");
    }

    req.session.admin = admin;
    res.redirect("/admin.html");
});

// Upload Media
app.post("/media/upload", upload.single("file"), async (req, res) => {
    if (!req.session.admin) return res.send("Unauthorized!");

    const type = req.file.mimetype.startsWith("image") ? "image" : "video";
    const media = new Media({
        filename: req.file.filename,
        type,
        caption: req.body.caption
    });
    await media.save();
    res.redirect("/admin.html");
});

// Fetch All Media (Ordered by upload time, newest first)
app.get("/media/all", async (req, res) => {
    const media = await Media.find().sort({ uploadTime: -1 });  // Sort by upload time in descending order (newest first)
    res.json(media);
});

// Like Media
app.post("/media/like/:id", async (req, res) => {
    await Media.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
    res.send("Liked!");
});

// Comment on Media
app.post("/media/comment/:id", async (req, res) => {
    const { username, comment } = req.body;
    await Media.findByIdAndUpdate(req.params.id, { $push: { comments: { username, comment } } });
    res.send("Comment added!");
});

// Delete Media (Admin only)
app.delete("/media/delete/:id", async (req, res) => {
    if (!req.session.admin) return res.send("Unauthorized!");

    await Media.findByIdAndDelete(req.params.id);
    res.send("Media deleted!");
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login.html");
});
function logger(req,res,next){
console.log(req.originalUrl)
next()
}
// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));*/
/*ORIGINALLY CODES
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = 3000;

// Set up MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/mediaz", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Define Schemas
const AdminSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    password: String
});

const MediaSchema = new mongoose.Schema({
    filename: String,
    type: String,
    caption: String,
    likes: { type: Number, default: 0 },
    comments: [{ username: String, comment: String }],
    uploadTime: { type: Date, default: Date.now }  // Add a timestamp for when the media is uploaded
});

// Models
const Admin = mongoose.model("Admin", AdminSchema);
const Media = mongoose.model("Media", MediaSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(logger);
app.use(session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true
}));
// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: "./public/uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Admin Registration
app.post("/admin/register", async (req, res) => {
    const { fullName, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) return res.send("Passwords do not match!");

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
        return res.send("Invalid credentials!");
    }

    req.session.admin = admin;
    res.redirect("/admin.html");
});

// Upload Media
app.post("/media/upload", upload.single("file"), async (req, res) => {
    if (!req.session.admin) return res.send("Unauthorized!");

    const type = req.file.mimetype.startsWith("image") ? "image" : "video";
    const media = new Media({
        filename: req.file.filename,
        type,
        caption: req.body.caption
    });
    await media.save();
    res.redirect("/admin.html");
});

// Fetch All Media (Ordered by upload time, newest first)
app.get("/media/all", async (req, res) => {
    const media = await Media.find().sort({ uploadTime: -1 });  // Sort by upload time in descending order (newest first)
    res.json(media);
});

// Like Media
app.post("/media/like/:id", async (req, res) => {
    await Media.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
    res.send("Liked!");
});

// Comment on Media
app.post("/media/comment/:id", async (req, res) => {
    const { username, comment } = req.body;
    await Media.findByIdAndUpdate(req.params.id, { $push: { comments: { username, comment } } });
    res.send("Comment added!");
});

// Delete Media (Admin only)
app.delete("/media/delete/:id", async (req, res) => {
    if (!req.session.admin) return res.send("Unauthorized!");

    await Media.findByIdAndDelete(req.params.id);
    res.send("Media deleted!");
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login.html");
});
function logger(req,res,next){
console.log(req.originalUrl)
next()
}
// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));*/


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

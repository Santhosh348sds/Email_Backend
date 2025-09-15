const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only allow 1 file
  },
});

// Configure nodemailer transporter - FIXED: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test transporter connection (will fail until we add real credentials)
transporter.verify((error, success) => {
  if (error) {
    console.log("⚠️  Email connection not ready:", error.message);
    console.log(
      "📝 Update .env file with real Gmail credentials when available"
    );
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    message: "Server is running!",
    timestamp: new Date().toISOString(),
    emailConfigured: process.env.EMAIL_USER !== "placeholder@gmail.com",
  });
});

// Email sending endpoint
app.post("/api/send-email", upload.single("resume"), async (req, res) => {
  try {
    console.log("📧 Received email request");
    console.log("Body:", req.body);
    console.log("File:", req.file ? req.file.originalname : "No file");

    const { name, location } = req.body;
    const resumeFile = req.file;

    // Validation
    if (!name || !location || !resumeFile) {
      console.log("❌ Validation failed");
      return res.status(400).json({
        error:
          "Missing required fields: name, location, and resume file are required",
      });
    }

    // Check if email is configured
    if (process.env.EMAIL_USER === "placeholder@gmail.com") {
      console.log("⚠️  Email not configured yet");
      return res.status(500).json({
        error: "Email service not configured yet. Please check server logs.",
      });
    }

    console.log(`📤 Sending email for: ${name} from ${location}`);

    const mailOptions = {
      from: `"Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.RECIPIENT_EMAIL,
      subject: `New Job Application from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            📋 New Job Application Received
          </h2>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p><strong>👤 Name:</strong> ${name}</p>
            <p><strong>📍 Location:</strong> ${location}</p>
            <p><strong>📎 Resume:</strong> ${resumeFile.originalname} (${(
        resumeFile.size /
        1024 /
        1024
      ).toFixed(2)} MB)</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>📧 Application Details:</strong></p>
            <p>File Type: ${resumeFile.mimetype}</p>
            <p>Received: ${new Date().toLocaleString()}</p>
          </div>
          
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            <em>This email was sent automatically from your website contact form.</em>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: resumeFile.originalname,
          content: resumeFile.buffer,
          contentType: resumeFile.mimetype,
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully");

    res.status(200).json({
      message: "Application submitted successfully!",
      details: {
        name: name,
        location: location,
        fileName: resumeFile.originalname,
        fileSize: resumeFile.size,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Error sending email:", error);

    // Different error messages for different scenarios
    let errorMessage = "Failed to send email. Please try again.";

    if (error.code === "EAUTH") {
      errorMessage =
        "Email authentication failed. Please check server configuration.";
    } else if (error.code === "EMESSAGE") {
      errorMessage = "Invalid email format. Please check your input.";
    } else if (error.code === "ECONNECTION") {
      errorMessage =
        "Unable to connect to email server. Please try again later.";
    }

    res.status(500).json({
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
});

// Test endpoint to verify file upload works
app.post("/api/test-upload", upload.single("resume"), (req, res) => {
  try {
    console.log("🧪 Test upload received");
    console.log("Body:", req.body);
    console.log(
      "File info:",
      req.file
        ? {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
          }
        : "No file"
    );

    res.json({
      message: "Upload test successful!",
      body: req.body,
      file: req.file
        ? {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            sizeInMB: (req.file.size / 1024 / 1024).toFixed(2),
          }
        : null,
    });
  } catch (error) {
    console.error("❌ Upload test failed:", error);
    res.status(500).json({ error: "Upload test failed" });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File size too large. Maximum 10MB allowed." });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res
        .status(400)
        .json({ error: "Too many files. Only 1 file allowed." });
    }
  }

  console.error("❌ Unexpected error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("\n🚀 Server running on port", PORT);
  console.log("📋 Available endpoints:");
  console.log("   GET  /api/health        - Server health check");
  console.log("   POST /api/send-email    - Send contact form email");
  console.log("   POST /api/test-upload   - Test file upload");
  console.log("\n📧 Email configuration:");
  console.log("   User:", process.env.EMAIL_USER);
  console.log("   Recipient:", process.env.RECIPIENT_EMAIL);
  console.log(
    "   Status:",
    process.env.EMAIL_USER === "placeholder@gmail.com"
      ? "⚠️  Not configured"
      : "✅ Configured"
  );
  console.log(
    "\n💡 To configure email: Update .env file with real Gmail credentials\n"
  );
});

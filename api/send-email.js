import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      message: "✅ Email API is working!",
      timestamp: new Date().toISOString(),
      emailConfigured: !!process.env.EMAIL_USER && process.env.EMAIL_USER !== "your-email@gmail.com",
      environment: {
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS,
        emailUserPreview: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 3) + "***" : "not set"
      }
    });
  }

  if (req.method === 'POST') {
    try {
      console.log('📧 Received POST request');
      console.log('Body:', req.body);
      console.log('Environment check:', {
        hasEmailUser: !!process.env.EMAIL_USER,
        hasEmailPass: !!process.env.EMAIL_PASS,
        emailUser: process.env.EMAIL_USER
      });

      const { name, location } = req.body;

      // Basic validation
      if (!name || !location) {
        console.log('❌ Validation failed');
        return res.status(400).json({
          error: "Name and location are required",
          received: { name, location }
        });
      }

      // Check if we have email config
      if (!process.env.EMAIL_USER) {
        console.log('❌ No EMAIL_USER found');
        return res.status(500).json({
          error: "EMAIL_USER environment variable not set"
        });
      }

      if (!process.env.EMAIL_PASS) {
        console.log('❌ No EMAIL_PASS found');
        return res.status(500).json({
          error: "EMAIL_PASS environment variable not set"
        });
      }

      if (process.env.EMAIL_USER === "your-email@gmail.com") {
        console.log('❌ EMAIL_USER not updated');
        return res.status(500).json({
          error: "Please update EMAIL_USER in Vercel environment variables"
        });
      }

      console.log('✅ Environment variables look good');
      console.log('📤 Attempting to send email...');

      // Create transporter
      const transporter = nodemailer.createTransporter({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      // Test the connection first
      console.log('🔍 Testing email connection...');
      await transporter.verify();
      console.log('✅ Email connection verified');

      const mailOptions = {
        from: `"Contact Form" <${process.env.EMAIL_USER}>`,
        to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER,
        subject: `New Contact from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #333;">📬 New Contact Form Submission</h2>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>👤 Name:</strong> ${name}</p>
              <p><strong>📍 Location:</strong> ${location}</p>
              <p><strong>⏰ Received:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p style="color: #666; font-size: 12px;">
              This email was sent from your website contact form.
            </p>
          </div>
        `,
        text: `New contact from ${name} in ${location}. Received at ${new Date().toLocaleString()}`
      };

      console.log('📧 Sending email...');
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);

      return res.status(200).json({
        success: true,
        message: "Email sent successfully!",
        data: { 
          name, 
          location, 
          timestamp: new Date().toISOString(),
          messageId: info.messageId
        }
      });

    } catch (error) {
      console.error('❌ Detailed error:', error);
      
      let errorMessage = "Failed to send email";
      let errorDetails = error.message;
      
      if (error.code === "EAUTH") {
        errorMessage = "Gmail authentication failed";
        errorDetails = "Check your Gmail app password. Make sure 2-Step Verification is enabled and you're using an App Password, not your regular password.";
      } else if (error.code === "ECONNECTION") {
        errorMessage = "Cannot connect to Gmail servers";
        errorDetails = "Network connection issue or Gmail servers are down.";
      } else if (error.responseCode === 535) {
        errorMessage = "Invalid Gmail credentials";
        errorDetails = "Username or app password is incorrect.";
      }

      return res.status(500).json({
        error: errorMessage,
        details: errorDetails,
        code: error.code,
        timestamp: new Date().toISOString()
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

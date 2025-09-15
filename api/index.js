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
      emailConfigured: !!process.env.EMAIL_USER && process.env.EMAIL_USER !== "your-email@gmail.com"
    });
  }

  if (req.method === 'POST') {
    try {
      const { name, location } = req.body;

      // Basic validation
      if (!name || !location) {
        return res.status(400).json({
          error: "Name and location are required"
        });
      }

      // Check if we have email config
      if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "your-email@gmail.com") {
        return res.status(200).json({
          success: true,
          message: "Form submitted! (Email not configured yet)",
          data: { name, location, timestamp: new Date().toISOString() }
        });
      }

      // Import nodemailer only when needed
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.default.createTransporter({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER,
        subject: `Contact from ${name}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({
        success: true,
        message: "Email sent successfully!",
        data: { name, location, timestamp: new Date().toISOString() }
      });

    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({
        error: "Failed to send email",
        details: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

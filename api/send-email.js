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
      console.log('=== POST REQUEST START ===');
      
      // Parse request body
      let body;
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        body = req.body;
      }
      
      console.log('Parsed body:', body);
      
      const { name, location } = body;

      // Validation
      if (!name || !location) {
        console.log('❌ Missing required fields');
        return res.status(400).json({
          error: "Name and location are required",
          received: { name, location }
        });
      }

      console.log(`✅ Valid input: ${name} from ${location}`);

      // Dynamic import of nodemailer
      console.log('📦 Importing nodemailer...');
      const nodemailer = await import('nodemailer');
      console.log('✅ Nodemailer imported successfully');

      // Create transporter
      console.log('🔧 Creating email transporter...');
      const transporter = nodemailer.default.createTransporter({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        timeout: 10000, // 10 second timeout
      });

      console.log('✅ Transporter created');

      // Verify connection (with timeout)
      console.log('🔍 Verifying email connection...');
      await Promise.race([
        transporter.verify(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 8000)
        )
      ]);
      console.log('✅ Email connection verified');

      // Prepare email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.RECIPIENT_EMAIL || process.env.EMAIL_USER,
        subject: `Contact from ${name}`,
        html: `
          <h2>New Contact</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        `,
        text: `New contact from ${name} in ${location}`
      };

      console.log('📧 Sending email to:', mailOptions.to);
      
      // Send email (with timeout)
      const info = await Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Send timeout')), 10000)
        )
      ]);

      console.log('✅ Email sent! Message ID:', info.messageId);
      console.log('=== POST REQUEST SUCCESS ===');

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
      console.error('=== POST REQUEST ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      console.error('Full error:', error);
      console.error('=== ERROR END ===');
      
      // Determine error type
      let userMessage = "Failed to send email";
      let statusCode = 500;
      
      if (error.message === 'Connection timeout' || error.message === 'Send timeout') {
        userMessage = "Email service timeout. Please try again.";
        statusCode = 408;
      } else if (error.code === "EAUTH" || error.responseCode === 535) {
        userMessage = "Email authentication failed. Please contact support.";
        statusCode = 503;
      } else if (error.code === "ECONNECTION") {
        userMessage = "Cannot connect to email service. Please try again later.";
        statusCode = 503;
      } else if (error.message.includes('nodemailer')) {
        userMessage = "Email service initialization failed.";
        statusCode = 500;
      }

      return res.status(statusCode).json({
        error: userMessage,
        details: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

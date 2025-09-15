export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    // Test nodemailer import
    console.log('Testing nodemailer import...');
    const nodemailer = await import('nodemailer');
    console.log('Nodemailer imported successfully');

    // Test transporter creation
    console.log('Testing transporter creation...');
    const transporter = nodemailer.default.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    console.log('Transporter created successfully');

    // Test verification
    console.log('Testing email verification...');
    await transporter.verify();
    console.log('Email verification successful');

    res.status(200).json({
      success: true,
      message: "All email tests passed!",
      environment: {
        emailUser: process.env.EMAIL_USER?.substring(0, 3) + "***",
        hasPassword: !!process.env.EMAIL_PASS,
        recipient: process.env.RECIPIENT_EMAIL || "same as sender"
      }
    });

  } catch (error) {
    console.error('Debug test failed:', error);
    
    res.status(500).json({
      error: "Debug test failed",
      details: error.message,
      code: error.code,
      step: "See server logs for details"
    });
  }
}

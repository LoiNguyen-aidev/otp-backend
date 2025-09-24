const express = require('express');
const sgMail = require('@sendgrid/mail');
require('dotenv').config();

const app = express();
app.use(express.json());

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Lưu OTP tạm thời: { "email": { otp: 123456, expire: 1690000000000 } }
const otpStore = {};

// API gửi OTP
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expire = Date.now() + 5 * 60 * 1000; // hết hạn sau 5 phút

  otpStore[email] = { otp, expire };

  const msg = {
    to: email,
    from: 'yourapp@gmail.com', // phải là email đã verify trên SendGrid
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
  };

  try {
    await sgMail.send(msg);
    return res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// API verify OTP
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email & OTP are required' });

  const record = otpStore[email];
  if (!record) return res.status(400).json({ error: 'No OTP requested for this email' });

  if (Date.now() > record.expire) {
    delete otpStore[email]; // xóa OTP hết hạn
    return res.status(400).json({ error: 'OTP expired' });
  }

  if (parseInt(otp) === record.otp) {
    delete otpStore[email]; // xóa sau khi dùng
    return res.json({ success: true, message: 'OTP verified successfully' });
  }

  return res.status(400).json({ error: 'Invalid OTP' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

require('dotenv').config(); // Load .env variables first
const express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

let lastContent = ''; // Store last snapshot in memory

// Email credentials from .env
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// ✅ Email transporter using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// 🔍 Function to check the housing site for changes
async function checkWebsite() {
  console.log('🔄 Checking housing website...');
  try {
    const { data: content } = await axios.get('https://www.stwdo.de/wohnen/aktuelle-wohnangebote');
    console.log(`📄 Fetched HTML length: ${content.length} characters`);

    if (lastContent && content !== lastContent) {
      console.log('🚨 Change detected on housing page! Sending email...');

      await transporter.sendMail({
        from: `"Tracker Bot 👀" <${EMAIL_USER}>`,
        to: "ur8067@srmist.edu.in",
        subject: '🆕 Housing Website Update Detected!',
        text: `🚨 A change was detected at:\nhttps://www.stwdo.de/wohnen/aktuelle-wohnangebote`,
      });

      console.log('📤 Email sent.');
    } else if (!lastContent) {
      console.log('📦 First snapshot loaded.');
    } else {
      console.log('✅ No change detected on housing page.');
    }

    lastContent = content; // Always update snapshot
  } catch (error) {
    console.error('❌ Error fetching housing website:', error.message);
  }
}

// 🌐 Function to hit external monitor API
async function hitMonitorAPI() {
  console.log('🌐 Hitting monitor API...');
  try {
    const response = await axios.get('https://webistemonitor.onrender.com/check-now');
    console.log(`✅ Monitor API responded with status: ${response.status}`);
  } catch (error) {
    console.error('❌ Error calling monitor API:', error.message);
  }
}

// ⏰ Cron job: Check housing site every 4 minutes
cron.schedule("*/4 * * * *", () => {
  checkWebsite();
});

// ⏱️ Cron job: Hit monitor API every 2 minutes
cron.schedule("*/2 * * * *", () => {
  hitMonitorAPI();
});

// 🌐 Health check route
app.get('/', (req, res) => res.send('🔎 Website Tracker is running.'));

// 🆕 Manual trigger for housing check
app.get('/check-now', async (req, res) => {
  console.log('📬 Manual trigger received.');
  await checkWebsite();
  res.send('✅ Manual website check completed.');
});

// Start server
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));

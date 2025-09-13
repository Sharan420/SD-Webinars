import nodemailer from "nodemailer";
import express from "express";
import cors from "cors";
import { google } from "googleapis";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cron from "node-cron";
import PaymentCaptured from "./models/paymentCaptured.js";

dotenv.config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/oauth2callback";
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const PORT = process.env.PORT || 3000;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendMail(email, subject, text, attachments, maxRetries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const accessToken = await oAuth2Client.getAccessToken();

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: "communications@theflowstate.co.in",
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
          refreshToken: REFRESH_TOKEN,
          accessToken: accessToken.token,
        },
      });

      const mailOptions = {
        from: "Admin TFS",
        to: email,
        subject: subject,
        html: text,
        attachments: attachments,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(
        `Email sent successfully (attempt ${attempt}):`,
        email,
        result.messageId
      );
      return; // Success, exit the function
    } catch (error) {
      lastError = error;
      console.error(
        `Email send failed (attempt ${attempt}/${maxRetries}):`,
        email,
        error.message
      );

      // If this is not the last attempt, wait 6 seconds before retrying
      if (attempt < maxRetries) {
        console.log(
          `Retrying in 6 seconds... (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, 6000));
      }
    }
  }

  // If all retries failed, log the final error
  console.error(
    `Email send failed after ${maxRetries} attempts:`,
    email,
    lastError.message
  );
}

async function oneHourReminder() {
  const allusers = await PaymentCaptured.find({});
  for (const user of allusers) {
    const email = user.email;
    const name = user.full_name;
    const oneHourReminderSubject = "Your Webinar Starts in 1 Hour – Get Ready!";
    const text = `<b style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;">Hi ${name},</b><br style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><br style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><span style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small; background-color: rgb(255, 255, 255);">Just a quick reminder that your registered webinar is starting in 1 hour:</span><br style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><br style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><b style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;">Meeting Details:</b><div style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><span style="font-family: arial, sans-serif;">The Pathway to Coaching at Elite Level - Webinar</span><b><br>
</b><img data-emoji="🗓" class="an1" alt="🗓" aria-label="🗓" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f5d3/32.png" loading="lazy" style="height: 1.2em; width: 1.2em; vertical-align: middle;"> Sunday, 14 September, 11:00 AM – 1:00 PM<br>
<br>
<b> Webinar Link:</b> <a href="https://meet.google.com/eqd-yohi-tvs" style="color: rgb(17, 85, 204);">Click here to join at 11:00 AM</a><br>
<br>
This is a private event, and you’ll need to join using the registered email address you provided at the time of purchase.<br>
<br>
We’re excited to have you with us, see you very soon!<br>
<br>
Best,<br>
<b>Soham Desai</b></div>`;
    sendMail(email, oneHourReminderSubject, text, []);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

async function fiveMinutesReminder() {
  const allusers = await PaymentCaptured.find({});
  for (const user of allusers) {
    const email = user.email;
    const name = user.full_name;
    const fiveMinutesReminderSubject =
      "Your Webinar Starts in 5 Minutes – Get Ready!";
    const text = `<b style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;">Hi ${name},</b><br style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><br style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><span style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small; background-color: rgb(255, 255, 255);">Just a quick reminder that your registered webinar is starting in 5 minutes:</span><br style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><br style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><b style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;">Meeting Details:</b><div style="color: rgb(34, 34, 34); font-family: Arial, Helvetica, sans-serif; font-size: small;"><span style="font-family: arial, sans-serif;">The Pathway to Coaching at Elite Level - Webinar</span><b><br>
</b><img data-emoji="🗓" class="an1" alt="🗓" aria-label="🗓" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f5d3/32.png" loading="lazy" style="height: 1.2em; width: 1.2em; vertical-align: middle;"> Sunday, 14 September, 11:00 AM – 1:00 PM<br>
<br>
<b> Webinar Link:</b> <a href="https://meet.google.com/eqd-yohi-tvs" style="color: rgb(17, 85, 204);">Click here to join at 11:00 AM</a><br>
<br>
This is a private event, and you’ll need to join using the registered email address you provided at the time of purchase.<br>
<br>
We’re excited to have you with us, see you very soon!<br>
<br>
Best,<br>
<b>Soham Desai</b></div>`;
    sendMail(email, fiveMinutesReminderSubject, text, []);
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/transaction-count", async (req, res) => {
  const transactionCount = await PaymentCaptured.countDocuments();
  res.status(200).send({ transactionCount });
});

app.post("/send-email", async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    const welcomeSubject = "The Pathway to Coaching at Elite Level - Webinar";
    const welcometestv2 = `<div dir="ltr"><font face="arial, sans-serif"><b style="color:rgb(31,31,31);font-variant-ligatures:no-contextual">Hello hello ${name}</b><span style="color:rgb(31,31,31);font-variant-ligatures:no-contextual">, </span><br style="color:rgb(31,31,31);font-variant-ligatures:no-contextual"><br style="color:rgb(31,31,31);font-variant-ligatures:no-contextual"><span style="color:rgb(31,31,31);font-variant-ligatures:no-contextual">Super excited to share the </span><b style="color:rgb(31,31,31);font-variant-ligatures:no-contextual">webinar joining link </b><span style="color:rgb(31,31,31);font-variant-ligatures:no-contextual">and looking forward to host you!</span><br style="color:rgb(31,31,31);font-variant-ligatures:no-contextual"><br>
<b>Meeting Details:<br>
</b>The Pathway to Coaching at Elite Level - Webinar</font><div><font face="arial, sans-serif">Sunday, 14 September · 11:00am – 1:00pm</font></div><div><font face="arial, sans-serif"><br>
<b>Webinar Link</b>:<b> </b><a href="https://meet.google.com/eqd-yohi-tvs" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://meet.google.com/hky-otfj-zfx&amp;source=gmail&amp;ust=1757848749347000&amp;usg=AOvVaw3Ny-Hjwq6KSaCbPkLnTdTv"><b>click here to join the call at 11am, 14th Sept</b></a><br>
<br>
</font><div><font face="arial, sans-serif"><span style="color:rgb(31,31,31);font-variant-ligatures:no-contextual">Please note this is</span><b style="color:rgb(31,31,31);font-variant-ligatures:no-contextual"> a private event</b><span style="color:rgb(31,31,31);font-variant-ligatures:no-contextual"> and you will be able to join using </span><b style="color:rgb(31,31,31);font-variant-ligatures:no-contextual">your registered email</b><span style="color:rgb(31,31,31);font-variant-ligatures:no-contextual"> address used at the time of purchase. You will also receive a <b>reminder to join</b> 1 hour and 5 minutes before the session. </span></font></div><div><span style="color:rgb(31,31,31);font-variant-ligatures:no-contextual"><font face="arial, sans-serif"><br>
</font></span></div><div><font face="arial, sans-serif"><span style="color:rgb(31,31,31);font-variant-ligatures:no-contextual">See you super soon!</span><br style="color:rgb(31,31,31);font-variant-ligatures:no-contextual"><span style="color:rgb(31,31,31);font-variant-ligatures:no-contextual">Soham Desai</span></font></div></div></div>`;

    sendMail(email, welcomeSubject, welcometestv2, []);

    res.status(200).send("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Error sending email");
  }
});

app.post("/rzp-webhook", async (req, res) => {
  try {
    if (
      !req.body.payload.payment.entity.notes.email ||
      !req.body.payload.payment.entity.notes.full_name ||
      !req.body.payload.payment.entity.notes.phone
    ) {
      console.log("PII not found");
      res.status(400).send("PII not found");
      return;
    }

    const {
      full_name: name,
      email,
      phone,
    } = req.body.payload.payment.entity.notes;

    const amount = req.body.payload.payment.entity.amount / 100;
    const payment_id = req.body.payload.payment.entity.id;

    const checkPaymentCaptured = await PaymentCaptured.findOne({ payment_id });
    if (checkPaymentCaptured) {
      console.log("Payment already captured");
      res.status(200).send("Payment already captured");
      return;
    }

    console.log(
      "Received Payment: ",
      name,
      email,
      phone,
      "ORDER ID: ",
      req.body.payload.payment.entity.id,
      "AMOUNT: ",
      req.body.payload.payment.entity.amount / 100
    );

    const payload = JSON.stringify(req.body.payload);
    try {
      // Get current time and date in IST (Indian Standard Time)
      const documentDate = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
      );
      const paymentCaptured = new PaymentCaptured({
        email,
        full_name: name,
        phone,
        amount,
        payment_id,
        date: documentDate,
        payload,
      });
      await paymentCaptured.save();
    } catch (error) {
      console.error("Error capturing payment:", error);
    }

    const welcomeSubject = "You're in, excited to have you for the webinar!";
    const welcometestv2 = `<span class="im" style="color: rgb(0, 0, 0); font-family: Arial, Helvetica, sans-serif; font-size: small; background-color: rgb(255, 255, 255);"><p>Hi ${name},</p>

<p><br>
Thank you so much for registering for my upcoming webinar “<b>The Pathway to Coaching at the Elite Level</b>”. In this session, we'll explore how to navigate your journey as a coach right from working at the grassroots to breaking into elite, high-performance sport.</p>

<p><br>

I'm super thrilled and looking forward to sharing my journey with you. More importantly, I'll walk you through the roadmap I wish I had when I was starting out: the skills to focus on, how to find mentors, and how to build a sustainable career as an elite coach. The session will also have a dedicated Q&A session where I will answer questions and clear doubts if any.</p>

<p><br>
<img data-emoji="⏰" class="an1" alt="⏰" aria-label="⏰" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/16.0/23f0/72.png" loading="lazy" style="height: 1.2em; width: 1.2em; vertical-align: middle;"> <b>Time:</b> 11 AM - 1 PM<br>
<img data-emoji="📅" class="an1" alt="📅" aria-label="📅" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f4c5/72.png" loading="lazy" style="height: 1.2em; width: 1.2em; vertical-align: middle;"> <b>Date: </b>14th September 2025, Sunday<br>
<img data-emoji="📍" class="an1" alt="📍" aria-label="📍" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/16.0/1f4cd/72.png" loading="lazy" style="height: 1.2em; width: 1.2em; vertical-align: middle;"> <b>Location:</b> Online Webinar (private access link will be shared soon)</p>

<p><br>
Here's what to expect next:</p>

</span><ul style="color: rgb(0, 0, 0); font-family: Arial, Helvetica, sans-serif; font-size: small; background-color: rgb(255, 255, 255);"><li style="margin-left: 15px;">Your spot is <b>secured and a calendar invite </b>has been shared.</li>
<span class="im" style="color: rgb(0, 0, 0);"><li style="margin-left: 15px;">A <b>payment confirmation and receipt</b> will be sent in your inbox.</li>
<li style="margin-left: 15px;"><b>24 hours</b> <b>before </b>the session, you'll receive your<b> private access link</b>.</li>
<li style="margin-left: 15px;">Keep an <b>eye on your inbox</b> for further communications and surprises!</li>
</span></ul>

<span class="im" style="color: rgb(0, 0, 0); font-family: Arial, Helvetica, sans-serif; font-size: small; background-color: rgb(255, 255, 255);"><p><br>
When the day arrives, just click the link, show up with an open mind, and I promise you'll walk away with clarity and direction for your coaching journey.</p>

<p><br>
This is not just another session. I'm truly grateful you chose to invest your time and trust in me. I don't take it lightly. My only goal is that, when we finish, you feel this was one of the best decisions you've made for your growth.</p>

<p><br>
See you there!<br>
Soham</p>

</span>`;

    sendMail(email, welcomeSubject, welcometestv2, []);

    const calendarSubject = "Your Calendar Invite for the Webinar!";
    const calendarLink =
      "https://calendar.google.com/calendar/render?action=TEMPLATE&text=The+Pathway+to+Coaching+at+the+Elite+Level&dates=20250914T053000Z/20250914T073000Z&details=Link+will+be+shared+24hours+prior+to+the+webinar";
    const calendarText = `<span class="im" style="color: rgb(0, 0, 0); font-family: Arial, Helvetica, sans-serif; font-size: small; background-color: rgb(255, 255, 255);">

  <p>Hello ${name},</p>

  <p><br>
    I'm super excited to have you join the webinar on <b>The Pathway to Coaching at the Elite Level</b> on 
    <b>14th September 2025</b>, and am sharing the calendar invite for the same.
  </p>

  <p><br>
    Please note the Zoom link with private access to join the session will be shared <b>24 hours prior</b> 
    to the session on your email.
  </p>

  <p style="text-align: center; margin: 30px 0;"><br>
    <a href="${calendarLink}"
       style="background-color:rgb(11, 76, 175); color: #ffffff; text-decoration: none; padding: 12px 24px; 
              border-radius: 6px; font-weight: bold; display: inline-block;">
      📅 Add to Calendar
    </a>
  </p>

  <p style="text-align: center; font-size: small;"><br>
    If you're unable to add it to your calendar, please find the link below:
    <a href="${calendarLink}">${calendarLink}</a>
  </p>

  <p><br>
    See you soon,<br/>
    Soham
  </p>

</span>`;
    sendMail(email, calendarSubject, calendarText, []);
    // Clean up temporary files
    res.status(200).send("Email sent successfully");
  } catch (error) {
    console.error("Error processing template:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });

// Schedule cron jobs
// 10:00 AM IST = 4:30 AM UTC (IST is UTC+5:30)
cron.schedule("30 4 * * *", () => {
  console.log("Running 1-hour reminder at 10:00 AM IST (4:30 AM UTC)");
  oneHourReminder().catch((error) => {
    console.error("Error running oneHourReminder:", error);
  });
});

// 10:50 AM IST = 5:20 AM UTC
cron.schedule("20 5 * * *", () => {
  console.log("Running 5-minute reminder at 10:50 AM IST (5:20 AM UTC)");
  fiveMinutesReminder().catch((error) => {
    console.error("Error running fiveMinutesReminder:", error);
  });
});

console.log("Cron jobs scheduled:");
console.log("- 1-hour reminder: 10:00 AM IST (4:30 AM UTC)");
console.log("- 5-minute reminder: 10:50 AM IST (5:20 AM UTC)");

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

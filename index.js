import nodemailer from "nodemailer";
import express from "express";
import fs from "fs";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import cors from "cors";
import { google } from "googleapis";
import dotenv from "dotenv";
import mongoose from "mongoose";
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

async function sendMail(email, subject, text, attachments) {
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
    console.log("Email sent:", result.messageId);
  } catch (error) {
    console.error(error);
  }
}

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/test-hook", async (req, res) => {
  try {
    const { email, full_name, phone } = req.body.payload.payment.entity.notes;
    const amount = req.body.payload.payment.entity.amount / 100;
    const payment_id = req.body.payload.payment.entity.id;
    res.status(200).send("Payment captured");
  } catch (error) {
    console.error("Error capturing payment:", error);
    res.status(500).send("Error capturing payment");
  }
});

app.post("/send-email", async (req, res) => {
  try {
    const name = "Sharan";
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
    sendMail("surabhisolanki03@gmail.com", calendarSubject, calendarText, []);
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

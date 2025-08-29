import nodemailer from "nodemailer";
import express from "express";
import fs from "fs";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import cors from "cors";
import { google } from "googleapis";
import dotenv from "dotenv";

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
      text: text,
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

app.post("/rzp-webhook", async (req, res) => {
  console.log(req.body);
  console.log(req.body?.payload);
  console.log(req.body?.payload?.payment);
  console.log(req.body?.payload?.payment?.entity);
  console.log(req.body?.payload?.payment?.entity?.notes);
  console.log(JSON.stringify(req.body));
  res.status(200).send("Webhook received");
});

app.post("/send-mail", async (req, res) => {
  try {
    const { name, email, amount, date, payment_id } = req.body;

    const welcomeSubject = "You're in, excited to have you for the webinar!";
    const welcomeText = `Hi ${name},

Thank you so much for registering for my upcoming webinar “The Pathway to Coaching at the Elite Level”. In this session, we'll explore how to navigate your journey as a coach right from working at the grassroots to breaking into elite, high-performance sport.

I'm super thrilled and looking forward to sharing my journey with you. More importantly, I'll walk you through the roadmap I wish I had when I was starting out: the skills to focus on, how to find mentors, and how to build a sustainable career as an elite coach.

⏰ Time: 11 AM - 1 PM
📅 Date: 14th September 2025, Sunday
📍 Location: Online Webinar (further details will be shared)

Here's what to expect next:

Your spot is secured and your calendar is blocked.
A confirmation and invoice will be sent your way shortly.
24 hours before the session, you'll receive your private access link.

When the day arrives, just click the link, show up with an open mind, and I promise you'll walk away with clarity and direction for your coaching journey.

This is not just another session. I'm truly grateful you chose to invest your time and trust in me. I don't take it lightly. My only goal is that, when we finish, you feel this was one of the best decisions you've made for your growth.

See you there!

Soham`;

    sendMail(email, welcomeSubject, welcomeText, []);
    // Read and process the template
    const content = fs.readFileSync("invoiceTemplate.docx", "binary");
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip);

    // Render the template with the data
    doc.render({ NAME: name, PAYID: payment_id, DATE: date, AMOUNT: amount });

    // Generate the filled document
    const buf = doc.getZip().generate({ type: "nodebuffer" });
    fs.writeFileSync("invoice.docx", buf);

    // Read the generated DOCX file
    const docxBuffer = fs.readFileSync("invoice.docx");

    const invoiceSubject =
      "Your Registration is Confirmed: The Pathway to Coaching at the Elite Level";
    const invoiceText = `Hi ${name},
Thank you for registering for my upcoming webinar - The Pathway to Coaching at the Elite Level.

✅ Your payment has been received successfully.
📄 Please find your invoice attached for your records.

Event Details:
⏰ Time: 11 AM - 1 PM
📅 Date: 14th September 2025, Sunday
📍 Location: Online Webinar (further details will be shared)

I can't wait to see you there and share the lessons I've learned the hard way, so you don't have to.
See you there!

Soham`;

    // Send email with DOCX attachment
    sendMail(email, invoiceSubject, invoiceText, [
      {
        filename: "invoice.docx",
        content: docxBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    ]);

    // Clean up temporary files
    fs.unlinkSync("invoice.docx");
    res.status(200).send("Email sent successfully");
  } catch (error) {
    console.error("Error processing template:", error);
    res.status(500).send(`Error: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

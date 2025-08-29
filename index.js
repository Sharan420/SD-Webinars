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
  console.log(req.body);
  console.log(req.body?.payload);
  console.log(req.body?.payload?.payment);
  console.log(req.body?.payload?.payment?.entity);
  console.log(req.body?.payload?.payment?.entity?.notes);
  console.log(JSON.stringify(req.body));
  res.status(200).send("Webhook received");
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

    const date = new Date().toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const amount = req.body.payload.payment.entity.amount / 100;
    const payment_id = req.body.payload.payment.entity.id;

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

    const welcomeSubject = "You're in, excited to have you for the webinar!";
    const welcomeText = `<p>Hi ${name},</p>

<p>Thank you so much for registering for my upcoming webinar “<b>The Pathway to Coaching at the Elite Level</b>”. In this session, we'll explore how to navigate your journey as a coach right from working at the grassroots to breaking into elite, high-performance sport.</p>

<p>I'm super thrilled and looking forward to sharing my journey with you. More importantly, I'll walk you through the roadmap I wish I had when I was starting out: the skills to focus on, how to find mentors, and how to build a sustainable career as an elite coach.</p>

<p>⏰ Time: 11 AM - 1 PM</p>
<p>📅 Date: 14th September 2025, Sunday</p>
<p>📍 Location: Online Webinar (further details will be shared)</p>

<p>Here's what to expect next:</p>
<ul>
<li>Your spot is secured and your calendar is blocked.</li>
<li>A confirmation and invoice will be sent your way shortly.</li>
<li>24 hours before the session, you'll receive your private access link.</li>
</ul>
<p>When the day arrives, just click the link, show up with an open mind, and I promise you'll walk away with clarity and direction for your coaching journey.</p>

<p>This is not just another session. I'm truly grateful you chose to invest your time and trust in me. I don't take it lightly. My only goal is that, when we finish, you feel this was one of the best decisions you've made for your growth.</p>

<p>See you there!</p>

<p>Soham</p>`;

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
    const invoiceText = `<p>Hi ${name},</p>
<p>Thank you for registering for my upcoming webinar - <b>The Pathway to Coaching at the Elite Level</b>.</p>

<p>✅ <b>Your payment has been received successfully.</b></p>
<p>📄 Please find your invoice attached for your records.</p>

<p><b>Event Details:</b></p>
<p>⏰ Time: 11 AM - 1 PM</p>
<p>📅 Date: 14th September 2025, Sunday</p>
<p>📍 Location: Online Webinar (further details will be shared)</p>

<p>I can't wait to see you there and share the lessons I've learned the hard way, so you don't have to.</p>
<p>See you there!</p>

<p>Soham</p>`;

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

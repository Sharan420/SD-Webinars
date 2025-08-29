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

async function sendMail(subject, text, attachments) {
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
      to: "sharansuri1980@gmail.com",
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
  res.status(200).send("Webhook received");
});

app.post("/send-mail", async (req, res) => {
  try {
    const { name, email, amount, date, payment_id } = req.body;

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

    // Send email with DOCX attachment
    sendMail("Invoice", "Invoice", [
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

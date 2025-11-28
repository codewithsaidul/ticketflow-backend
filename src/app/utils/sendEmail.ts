/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Resend } from "resend";
import { envVars } from "../config/env";
import path from "path";
import ejs from "ejs";
import { AppError } from "../errorHelpers/AppError";

// আপনার ইন্টারফেস হুবহু সেইম আছে
interface SendEmailOption {
  to: string;
  subject: string;
  templateName: string;
  templateData?: Record<string, any>;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
}

// Transport এর বদলে Resend Instance
const resend = new Resend(envVars.EMAIL_SENDER.RESEND_API_KEY); // .env ফাইলে API Key রাখবেন

export const sendEmail = async ({
  to,
  subject,
  templateName,
  templateData,
  attachments,
}: SendEmailOption) => {
  try {
    const templatePath = path.join(__dirname, `templates/${templateName}.ejs`);
    
    // আপনার কাস্টম EJS ডিজাইন জেনারেট হচ্ছে
    const html = await ejs.renderFile(templatePath, templateData);

    const recipientEmail = envVars.NODE_ENV === 'production' 
      ? to 
      : 'vshvs82@gmail.com';
    // Nodemailer এর sendMail এর বদলে Resend এর send
    const { data, error } = await resend.emails.send({
      from: "TicketFlow Support <onboarding@resend.dev>",
      to: recipientEmail,
      subject: subject,
      html: html, // 🔥 আপনার কাস্টম HTML ডিজাইন হুবহু যাবে
      attachments: attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
      })),
    });

    if (error) {
      throw new Error(error.message);
    }

    console.log("✅ Email sent successfully:", data);
  } catch (err: any) {
    console.log("❌ Email Error:", err);
    throw new AppError(401, "Email Sending Failed", err);
  }
};
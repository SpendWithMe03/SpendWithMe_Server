import { createTransport } from "nodemailer";
import { SMTP_MAIL, SMTP_PASSWORD } from "../config/config.js";
import { error, success } from "../library/Logging.js";

// CREATE TRANSPORTER OBJECT FOR SENDING EMAIL USING SMTP SERVER OF GMAIL SERVICE
const transport = createTransport({
  service: "gmail",
  auth: {
    user: SMTP_MAIL,
    pass: SMTP_PASSWORD,
  },
});

// FUNCTION TO SEND EMAIL TO USER
const sendMail = (link, email, Type, data, next) => {
  let subject = "";
  let htmlContent = "";

  // Generate email content based on the Type
  switch (Type) {
    case "signup":
      subject = "Welcome to Spend With Me - Complete Your Signup!";
      htmlContent = `
        <div class="hero">
          <p>Thanks for joining us! Click the button below to complete your signup:</p>
          <div class="verification-options">
            <a href="${link}" class="verify-button">Complete Signup</a>
          </div>
        </div>
        <div class="message">
          <p>Welcome to Spend With Me! We're excited to have you on board. If you didn't request this email, you can safely ignore it.</p>
        </div>`;
      break;

    case "forgotpassword":
      subject = "Reset Your Password - Spend With Me";
      htmlContent = `
        <div class="hero">
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <div class="verification-options">
            <a href="${link}" class="verify-button">Reset Password</a>
          </div>
        </div>
        <div class="message">
          <p>If you didn't request a password reset, you can safely ignore this email. Your account security is important to us.</p>
        </div>`;
      break;

    case "emailverification":
      subject = "Verify Your Email - Spend With Me";
      htmlContent = `
        <div class="hero">
          <p>Please verify your email address by clicking the button below:</p>
          <div class="verification-options">
            <a href="${link}" class="verify-button">Verify Email</a>
          </div>
        </div>
        <div class="message">
          <p>If you didn't request this verification, you can safely ignore this email.</p>
        </div>`;
      break;

    case "expense":
      // Define category colors
      const categoryColors = {
        Food: "#FF5733", // Orange
        Transportation: "#33B5FF", // Blue
        Entertainment: "#8E44AD", // Purple
        Healthcare: "#28B463", // Green
        Shopping: "#FFC300", // Yellow
        Bills: "#E74C3C", // Red
        Other: "#95A5A6", // Gray
      };

      // Get the color for the category, default to gray if not found
      const categoryColor = categoryColors[data.category] || "#95A5A6";

      subject = `Expense Notification - ${data.user.name}`;
      htmlContent = `
    <div class="hero" style="font-family: Arial, sans-serif; line-height: 1.6; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
      <div style="border-left: 3px solid ${categoryColor}; padding-left: 15px; margin-bottom: 20px;">
        <p style="font-size: 22px; font-weight: bold; margin-bottom: 5px;">Hello ${
          data.user.name
        },</p>
        <p style="font-size: 16px;">An expense has been added to your group. Here are the details:</p>
      </div>
      
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #4c51bf; color: white; text-align: left;">
            <th style="padding: 14px; font-size: 16px;">Field</th>
            <th style="padding: 14px; font-size: 16px;">Details</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; font-size: 15px; font-weight: 500;">Amount</td>
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; color: #FF0000; font-weight: bold; font-size: 16px;">₹${data.amount.toLocaleString()}</td>
          </tr>
          <tr style="background-color: #f7fafc;">
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; font-size: 15px; font-weight: 500;">Description</td>
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; font-size: 15px;">${
              data.description || "No description provided"
            }</td>
          </tr>
          <tr>
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; font-size: 15px; font-weight: 500;">Date</td>
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; font-size: 15px;">${new Date(
              data.date
            ).toLocaleDateString()}</td>
          </tr>
          <tr style="background-color: #f7fafc;">
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; font-size: 15px; font-weight: 500;">Category</td>
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; font-size: 15px;">
              <span style="color: ${categoryColor}; font-weight: bold; padding: 5px 10px; border-radius: 12px; background-color: #fff; border: 1px solid ${categoryColor};">${
        data.category
      }</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; font-size: 15px; font-weight: 500;">Paid By</td>
            <td style="padding: 14px; border-top: 1px solid #e2e8f0; font-size: 15px;">${
              data.paidBy
            }</td>
          </tr>
        </tbody>
      </table>
      
      <div style="background-color: #ebf4ff; border-radius: 8px; padding: 15px; margin-top: 20px; border: 1px solid #3b82f6;">
        <p style="font-size: 16px; margin: 0;">Please log in to your account to view more details or make changes.</p>
      </div>
    </div>
    
    <div class="message" style="margin-top: 25px; text-align: center; padding: 15px; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 14px;">If you have any questions, feel free to contact us.</p>
    </div>`;
      break;

    default:
      subject = "Spend With Me Notification";
      htmlContent = `
        <div class="hero">
          <p>This is a notification from Spend With Me. Please contact support if you have any questions.</p>
        </div>`;
      break;
  }

  // Email options
  const mailOptions = {
    from: SMTP_MAIL,
    to: email,
    subject: subject,
    html: `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        /* Base styles that work in both light and dark modes */
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 20px;
          line-height: 1.6;
          background-color: #f5f7fa;
          color: #2d3748;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #0066ff, #0052cc);
          padding: 25px;
          text-align: center;
          color: #ffffff;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }
        .hero {
          background-color: #f8faff;
          padding: 35px 30px;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
        }
        .hero p {
          font-size: 18px;
          color: #2d3748;
          margin: 0 0 20px 0;
        }
        .verification-options {
          margin: 25px auto;
          text-align: center;
        }
        .verify-button {
          display: inline-block;
          background-color: #22c55e;
          color: #ffffff !important;
          padding: 16px 32px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          margin: 10px 0;
          transition: all 0.2s;
          font-size: 16px;
          border: 1px solid #16a34a;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .verify-button:hover {
          background-color: #16a34a;
          transform: translateY(-2px);
          box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }
        .message {
          padding: 30px;
          color: #4a5568;
          font-size: 16px;
          line-height: 1.8;
          background-color: #ffffff;
        }
        .footer {
          background-color: #f9fafb;
          padding: 25px;
          text-align: center;
          border-top: 1px solid #e2e8f0;
        }
        .footer p {
          margin: 8px 0;
          color: #718096;
          font-size: 14px;
        }
        .social-links {
          margin-top: 20px;
        }
        .social-links a {
          color: #0066ff;
          text-decoration: none;
          margin: 0 10px;
          font-weight: 500;
        }
        .social-links a:hover {
          text-decoration: underline;
        }
        .email-address {
          color: #0066ff;
          text-decoration: none;
          font-weight: 500;
        }
        
        /* Lighter table styling for better user experience */
        table {
          border: 1px solid #e2e8f0;
        }
        th {
          background-color: #4c51bf;
          color: white;
          font-weight: bold;
        }
        td {
          border-top: 1px solid #e2e8f0;
          color: #2d3748;
        }
        tr:nth-child(even) {
          background-color: #f7fafc;
        }
        /* Make links more visible */
        a {
          color: #0066ff !important;
          font-weight: 500;
        }
        
        /* Force high contrast in dark mode clients */
        @media (prefers-color-scheme: dark) {
          /* These styles won't apply in most email clients,
           but will help in those that support media queries */
          .container {
            background-color: #1a202c !important;
            border-color: #4a5568 !important;
          }
          .hero, .message {
            background-color: #2d3748 !important;
            color: #f7fafc !important;
          }
          .hero p, .message p {
            color: #e2e8f0 !important;
          }
          .footer {
            background-color: #1a202c !important;
            border-color: #4a5568 !important;
          }
          .footer p {
            color: #cbd5e0 !important;
          }
          table {
            border-color: #4a5568 !important;
          }
          td {
            border-color: #4a5568 !important;
            color: #e2e8f0 !important;
          }
          tr:nth-child(even) {
            background-color: #2d3748 !important;
          }
          tr:nth-child(odd) {
            background-color: #1a202c !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Spend With Me</h1>
        </div>
        ${htmlContent}
        <div class="footer">
          <p>Need help? Contact us:</p>
          <p>Email: <a href="mailto:spendwithme03@gmail.com" class="email-address">spendwithme03@gmail.com</a></p>
          <div class="social-links">
            <a href="https://facebook.com/spendwithme" target="_blank">Facebook</a>
            <a href="https://twitter.com/spendwithme" target="_blank">Twitter</a>
            <a href="https://instagram.com/spendwithme" target="_blank">Instagram</a>
          </div>
          <p>© 2024 Spend With Me. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>`,
  };

  // Send email
  transport.sendMail(mailOptions, function (err, info) {
    if (err) {
      error("Error sending email");
      error(err);
      next(err);
    } else {
      success("Email sent");
      success(info.response);
    }
  });
};

export default sendMail;

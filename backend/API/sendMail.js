const nodemailer = require('nodemailer');
const path = require('path'); // Add this line
require('dotenv').config();

// Create a test account or replace with real credentials.
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
    user: process.env.EMAIL_USER,  
    pass: process.env.EMAIL_PASS   
    },
});

const mailOptions = {
    from: {
        name: 'Campaign Manager',
        address: process.env.USER
    },
    to: ["testest242001@gmail.com"],
    subject: "Test Email from Campaign Manager",
    text: "This is a test email sent from the Campaign Manager application.",
    html: "<h1>Test Email</h1><p>This is a test email sent from the Campaign Manager application.</p>",
    attachments: [
        {
            filename: 'test.pdf',
            path: path.join(__dirname, 'test.pdf'),
            contentType: 'application/pdf'
        },
        {
            filename: 'bna.png',
            path: path.join(__dirname, 'bna.png'),
            contentType: 'image/png'
        }
    ]
};

const sendMail = async (transporter, mailOptions) => {
    try {
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully!");
    } catch (error) {
        console.error("Error sending email:", error);
    }
};

sendMail(transporter, mailOptions);
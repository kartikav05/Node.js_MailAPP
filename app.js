const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();


const CLIENT_ID = process.env.CLIENT_ID;                     // Gmail API configuration
const CLIENT_SECRET = process.env.CLEINT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const SENDER_EMAIL  =  process.env.SENDER_EMAIL;

const oauth2Client = new google.auth.OAuth2(                
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });


const transporter = nodemailer.createTransport({           // Nodemailer configuration 
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: SENDER_EMAIL,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    refreshToken: REFRESH_TOKEN,
    accessToken: oauth2Client.getAccessToken(),
  },
});


async function checkEmails() {                                                   // Function to check for new emails
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const res = await gmail.users.messages.list({ userId: 'me', q: 'is:inbox' });   //Finding list of messages in inbox
  const messages = res.data.messages || [];

  for (const message of messages) {                                               //Looping over each message from the messages array
    const messageData = await gmail.users.messages.get({ userId: 'me', id: message.id });
    const headers = messageData.data.payload.headers;                             //Getting header data
    const replyHeader = headers.find(header => header.name.toLowerCase() === 'in-reply-to'); //  Find in-reply-to header if present

    if (!replyHeader) {                                                           //  Check if the in-reply-to header is not there
      const email = messageData.data.payload.headers.find(
        header => header.name.toLowerCase() === 'from'
      ).value;
      const subject = 'Re: ' + messageData.data.payload.headers.find(
        header => header.name.toLowerCase() === 'subject'
      ).value;
      const body = 'Hello I got your email. Am on vacation will get back to you soon :) .';

      await sendEmail(email, subject, body);                                       //Sending email
      await labelAndMoveEmail(gmail, message.id, 'Label_4');                       //Label_4 is the labelId which is 
                                                                                   //already created with labelname MailApp
    }
  }
}


async function sendEmail(email, subject, body) {                       // Function to send an email
  const mailOptions = {
    from: SENDER_EMAIL,
    to: email,
    subject: subject,
    text: body,
  };

  await transporter.sendMail(mailOptions);
}
async function labelAndMoveEmail(gmail, messageId, labelId) {           // Function to label and move an email
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    resource: { addLabelIds: [labelId], removeLabelIds: ['INBOX'] },
  });
}
function getRandomInterval() {                                            // Function to generate random interval between 45 and 120 seconds
  return Math.floor(Math.random()*(120 - 45 + 1) + 45) * 1000;
}

setInterval(checkEmails, getRandomInterval());                             // Checking Emails in random interval of time

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('html-pdf');
const fs = require('fs');
const csv = require('csv-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

function convertHtmlToPdf(htmlContent, options = {}) {
  return new Promise((resolve, reject) => {
    pdf.create(htmlContent, options).toBuffer((error, buffer) => {
      if (error) {
        console.error('Error generating PDF:', error);
        reject(error);
      } else {
        console.log('PDF generated successfully in memory');
        resolve(buffer);
      }
    });
  });
}

function generateHtmlContent(name, position, start_date) {
    return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Letter of Intent</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              line-height: 1.8;
              font-size: 16px;
              margin: 0;
              padding: 0;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
          }
          .content {
              padding: 40px;
              flex-grow: 1;
          }
          h2 {
              color: #333;
              text-align: center;
              font-size: 28px;
              margin-top: 40px;
              margin-bottom: 40px;
          }
          p {
              margin-bottom: 25px;
          }
          ul {
              margin-bottom: 25px;
              padding-left: 40px;
          }
          .logo {
              text-align: center;
              margin-bottom: 50px;
          }
          .date {
              text-align: right;
              margin-bottom: 50px;
              font-size: 18px;
          }
          .footer {
              padding: 10px 40px;
              font-size: 12px;
              margin-top: auto;
          }
          .company-name {
              font-size: 20px;
              font-weight: bold;
              margin-top: 40px;
          }
      </style>
  </head>
  <body>
      <div class="content">
          <div class="logo">
              <img src="https://media.licdn.com/dms/image/v2/C510BAQEKkTnNRYLztA/company-logo_200_200/company-logo_200_200/0/1631403389130/skh_emerge_logo?e=2147483647&v=beta&t=QtzqsQ8Fnpz4Q95ZwNgyLqtPilv-8iIQ5AeNVPLeTic" alt="Company Logo" style="max-width: 250px; height: auto;"/>
          </div>
        
          <h2>Sub- Letter of Intent</h2>
          
          <p>Dear <strong>${name}</strong>,</p>
          
          <p>This is with reference to your application and subsequent interview you had with us. We have pleasure in offering you an appointment as <strong>${position}</strong> in our organization on the terms and conditions as discussed and agreed mutually at the time of interview.</p>
          
          <p>You are advised to join your duties on <strong>${start_date}</strong> as per below mentioned details:-</p>
          
          <p>You are also advised to submit the following original documents along with one set of photocopy of certificates to us at the earliest or latest at the time of joining the duties.</p>
          
          <ul>
              <li>Copies of educational & professional certificates</li>
              <li>Four recent passport size photographs, Pan No and address proof.</li>
          </ul>
          
          <p>This appointment is subject to your being found medically fit, a positive background verification check and terms as agreed at the time of interview.</p>
          
          <p>Please intimate your acceptance by signing and returning the duplicate copy of the letter.</p>
          
          <p>We look forward to having you among us in Krishna Group.</p>
          
          <p class="company-name">SKH Group</p>
      </div>
      
      <div class="footer">
          <p>*Since this is a digitally generated document, signature and stamp are not required.</p>
          <p>*Appointment letter containing details about CTC will be handed over to you on joining the plant</p>
      </div>
  </body>
  </html>
    `;
  }

const options = {
  format: 'A4',
  border: {
    top: '15mm',
    right: '15mm',
    bottom: '15mm',
    left: '15mm'
  }
};

async function processCSV(filePath) {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

async function sendEmail(to, email, subject, name, position, start_date, pdfBuffer, coordinator, coordinator_contact,Location) {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "Shreya@factorykaam.com",
      pass: "lddq hbfq klyq cszx"
    }
  });

  const emailHtml = `Dear ${name},<br><br>
We are delighted to inform you that you have been selected for the position of <b>${position}</b> in SKH Group.<br><br>
Further, the Appointment letter will be issued to you on the date of joining the SKH plant, which will contain the entire break up of your salary structure.<br><br>
<b>Your official Start Date will be ${start_date}</b><br><br>
${coordinator && coordinator_contact ? 
  `The Name of the SKH coordinator along with their contact number is mentioned below:<br><br>
  Name: ${coordinator}<br>
  Mobile: ${coordinator_contact}<br>
  ${Location}<br><br>` : 
  `The location of the plant and its coordinators contact details will be shared with you near to the date of joining.<br><br>`
}
Please feel free to call me at 7494967242 or write to me at anshika@factorykaam.com in case you have any doubts or clarification.<br><br>
All the best for a successful career with SKH Group!<br><br>
Thanks and Regards,<br>
Anshika Khurana<br>
7060522828`;

  let info = await transporter.sendMail({
    from: '"Factorykaam" <anshika@factorykaam.com>',
    to: email,
    cc: ["annanay@factorykaam.com","kshitij@factorykaam.com","ridhi@factorykaam.com","anshika@factorykaam.com"],
    subject: subject,
    html: emailHtml,
    attachments: [
      {
        filename: 'OfferLetter.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  });


  console.log(`Email sent to ${to}: ${info.messageId}`);
}

// API endpoint to handle file upload and process offer letters
app.post('/api/generate-letters', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const csvData = await processCSV(file.path);
    const generatedFiles = [];

    for (const row of csvData) {
      const { name, position, start_date, email, coordinator, coordinator_contact,Location } = row;
      const htmlContent = generateHtmlContent(name, position, start_date);
      const pdfBuffer = await convertHtmlToPdf(htmlContent, options);
      
      // Save PDF buffer and file info
      generatedFiles.push({
        name: `${name}`,
        buffer: pdfBuffer,
        email,
        position,
        start_date,
        coordinator,
        coordinator_contact,
        Location
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    // Store generated files in memory (you might want to implement proper storage)
    app.locals.generatedFiles = generatedFiles;

    res.json({
      files: generatedFiles.map(({ buffer, ...fileInfo }) => fileInfo)
    });
  } catch (error) {
    console.error('Error generating letters:', error);
    res.status(500).json({ error: 'Failed to generate offer letters' });
  }
});

// API endpoint to send emails
app.post('/api/send-emails', async (req, res) => {
  try {
    const generatedFiles = app.locals.generatedFiles || [];
    let sent = 0;

    for (const file of generatedFiles) {
      const { email, name, position, start_date, buffer, coordinator, coordinator_contact,Location } = file;
      const emailSubject = `Congratulations! Selected for ${position} at SKH Group`;
      
      await sendEmail(
        email,
        email,
        emailSubject,
        name,
        position,
        start_date,
        buffer,
        coordinator,
        coordinator_contact,
        Location
      );
      sent++;
    }

    res.json({ sent });
  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ error: 'Failed to send emails' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
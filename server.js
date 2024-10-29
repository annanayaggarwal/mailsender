const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const path = require('path');
const csv = require('csv-parser');
const fs = require('fs').promises;
const PDFDocument = require('pdfkit');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

async function fetchImageBuffer(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

async function generateAndSavePDF(docData) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      });

      // Collect the PDF data chunks
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log(`PDF generated successfully for ${docData.name}`);
        resolve({ buffer: pdfBuffer });
      });

      try {
        // Fetch and add company logo
        const logoUrl = "https://media.licdn.com/dms/image/v2/C510BAQEKkTnNRYLztA/company-logo_200_200/company-logo_200_200/0/1631403389130/skh_emerge_logo?e=2147483647&v=beta&t=QtzqsQ8Fnpz4Q95ZwNgyLqtPilv-8iIQ5AeNVPLeTic";
        const logoBuffer = await fetchImageBuffer(logoUrl);
        
        // Add logo with proper centering
        const pageWidth = doc.page.width;
        const logoWidth = 110;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.image(logoBuffer, logoX, 20, { 
          width: logoWidth,
          align: 'center'
        });
      } catch (error) {
        console.error('Error adding logo:', error);
      }
      
      // Add header
      doc.moveDown(9);
      doc.font('Helvetica-Bold').fontSize(20).text('Letter of Intent', { align: 'center' });
      doc.moveDown();

      // Add content
      doc.fontSize(12);
      
      doc.font('Helvetica').text('Dear ', { continued: true })
         .font('Helvetica-Bold').text(`${docData.name}`, { continued: false });
      doc.moveDown();

      doc.font('Helvetica').text('This is with reference to your application and subsequent interview you had with us. We have pleasure in offering you an appointment as ', {
        continued: true,
        align: 'justify'
      });
      
      doc.font('Helvetica-Bold').text(`${docData.position} `, {
        continued: true,
        align: 'justify'
      });
      
      doc.font('Helvetica').text(' in our organization on the terms and conditions as discussed and agreed mutually at the time of interview.', {
        align: 'justify'
      });
      doc.moveDown();

      doc.font('Helvetica').text('You are advised to join your duties on ', {
        continued: true
      });
      
      doc.font('Helvetica-Bold').text(`${docData.start_date}`, {
        continued: true
      });
      
      doc.font('Helvetica').text(' as per below mentioned details:-');
      doc.moveDown();

      doc.text('You are also advised to submit the following original documents along with one set of photocopy of certificates to us at the earliest or latest at the time of joining the duties:', {
        align: 'justify'
      });
      doc.moveDown();

      const bulletPoints = [
        'Copies of educational & professional certificates',
        'Four recent passport size photographs, Pan No and address proof.'
      ];

      bulletPoints.forEach(point => {
        doc.text('• ' + point, {
          indent: 20,
          align: 'left'
        });
      });
      doc.moveDown();

      doc.text('This appointment is subject to your being found medically fit, a positive background verification check and terms as agreed at the time of interview.', {
        align: 'justify'
      });
      doc.moveDown();

      doc.text('Please intimate your acceptance by signing and returning the duplicate copy of the letter.');
      doc.moveDown();

      doc.text('We look forward to having you among us in SKH Group.');
      doc.moveDown(2);

      doc.font('Helvetica-Bold').text('SKH Group');
      doc.font('Helvetica');

      const footerText = [
        '*Since this is a digitally generated document, signature and stamp are not required.',
        '*Appointment letter containing details about CTC will be handed over to you on joining the plant'
      ];

      const footerY = doc.page.height - 100;
      footerText.forEach((text, index) => {
        doc.fontSize(10).text(text, 50, footerY + (index * 20), {
          color: 'gray',
          align: 'left'
        });
      });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

async function processCSV(filePath) {
  const results = [];
  const fileContent = await fs.readFile(filePath);
  
  return new Promise((resolve, reject) => {
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileContent);
    
    bufferStream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

async function sendEmail(recipient, subject, name, position, start_date, pdfBuffer, coordinator, coordinator_contact, location) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "anshika@factorykaam.com",
      pass: "npwr ihbm ywsu ynxf"
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
      ${location}<br><br>` : 
      `The location of the plant and its coordinators contact details will be shared with you near to the date of joining.<br><br>`
    }
    Please feel free to call me at 7060522828 or write to me at anshika@factorykaam.com in case you have any doubts or clarification.<br><br>
    All the best for a successful career with SKH Group!<br><br>
    Thanks and Regards,<br>
    Anshika Khurana<br>
    7060522828`;

  await transporter.sendMail({
    from: '"Factorykaam" <anshika@factorykaam.com>',
    to: recipient,
    cc: ["annanay@factorykaam.com"],
    subject: subject,
    html: emailHtml,
    attachments: [{
      filename: 'OfferLetter.pdf',
      content: pdfBuffer,
      contentType: 'application/pdf'
    }]
  });
  
  console.log(`PDF sent successfully to ${name}'s email`);
}

// API endpoint to handle file upload and process offer letters
app.post('/api/generate-letters', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const csvData = await processCSV(file.path);
    const generatedFiles = [];

    for (const row of csvData) {
      const { name, position, start_date, email, coordinator, coordinator_contact, location } = row;
      
      const { buffer } = await generateAndSavePDF({
        name,
        position,
        start_date
      });
      
      generatedFiles.push({
        name,
        buffer,
        email,
        position,
        start_date,
        coordinator,
        coordinator_contact,
        location
      });
    }

    // Clean up uploaded file
    await fs.unlink(file.path);

    // Store generated files in memory
    app.locals.generatedFiles = generatedFiles;

    res.json({
      success: true,
      files: generatedFiles.map(({ buffer, ...fileInfo }) => fileInfo)
    });
  } catch (error) {
    console.error('Error generating letters:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate offer letters',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// API endpoint to send emails
app.post('/api/send-emails', async (req, res) => {
  try {
    const generatedFiles = app.locals.generatedFiles || [];
    let sent = 0;

    for (const file of generatedFiles) {
      const { email, name, position, start_date, buffer, coordinator, coordinator_contact, location } = file;
      const emailSubject = `Congratulations! Selected for ${position} at SKH Group`;
      
      await sendEmail(
        email,
        emailSubject,
        name,
        position,
        start_date,
        buffer,
        coordinator,
        coordinator_contact,
        location
      );
      sent++;
    }

    res.json({ 
      success: true,
      sent,
      message: `Successfully sent ${sent} emails`
    });
  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to send emails',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
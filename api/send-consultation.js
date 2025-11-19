// api/send-consultation.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read raw body
    let rawBody = '';
    await new Promise((resolve, reject) => {
      req.on('data', chunk => {
        rawBody += chunk;
      });
      req.on('end', () => resolve());
      req.on('error', reject);
    });

    let data = {};

    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
      // JSON from fetch
      data = JSON.parse(rawBody || '{}');
    } else {
      // Form submit: application/x-www-form-urlencoded
      const params = new URLSearchParams(rawBody);
      data = Object.fromEntries(params.entries());
    }

    const {
      parentName,
      studentName,
      yearLevel,
      pathway,
      subjects,
      email,
      phone,
      notes,
    } = data;

    const toEmail = process.env.ABB_ENQUIRY_EMAIL;

    if (!toEmail) {
      console.error('ABB_ENQUIRY_EMAIL is not set');
      return res.status(500).json({ error: 'Server email not configured' });
    }

    const text = `
New ABB consultation enquiry

Parent or guardian: ${parentName || ''}
Student: ${studentName || ''}
Year level: ${yearLevel || ''}
Pathway: ${pathway || ''}
Subjects or areas: ${subjects || ''}

Parent email: ${email || ''}
Parent phone: ${phone || ''}

Notes:
${notes || ''}
`.trim();

    await resend.emails.send({
      from: 'ABB Tutoring <no-reply@abbtutoring.com>', // replace with a verified sender
      to: toEmail,
      subject: 'New ABB consultation enquiry',
      text,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error in send-consultation:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

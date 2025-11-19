export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const {
      parentName,
      studentName,
      contactEmail,
      phone,
      grade,
      examPathway,
      message,
    } = req.body || {};

    // Basic validation
    if (!parentName || !studentName || !contactEmail || !grade || !examPathway) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Email 1: internal notification to you
    const adminHtml = `
      <h2>New Consultation Request</h2>
      <p><strong>Parent name:</strong> ${parentName}</p>
      <p><strong>Student name:</strong> ${studentName}</p>
      <p><strong>Contact email:</strong> ${contactEmail}</p>
      <p><strong>Phone:</strong> ${phone || "(not provided)"}</p>
      <p><strong>Year / grade:</strong> ${grade}</p>
      <p><strong>Exam pathway:</strong> ${examPathway}</p>
      <p><strong>Notes:</strong><br>${message ? message.replace(/\n/g, "<br>") : "(none)"}</p>
    `;

    const adminResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ABB Tutoring <noreply@abbtutoring.org>",
        to: "abb.tutoring1@gmail.com", // ← change to your inbox
        subject: "New ABB Tutoring consultation request",
        html: adminHtml,
      }),
    });

    if (!adminResponse.ok) {
      const text = await adminResponse.text();
      console.error("Resend admin email error:", text);
      return res.status(500).json({ error: "Failed to send admin email" });
    }

    // Email 2: confirmation to parent (generic, polite)
    const parentHtml = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 8px;">Thank you for contacting ABB Tutoring</h2>
        <p>Dear ${parentName},</p>
        <p>
          We have received your consultation request for <strong>${studentName}</strong>.
          One of our tutors will review your details and get back to you shortly to organise a time.
        </p>
        <p style="margin-top: 12px; font-size: 14px; color: #4b5563;">
          <strong>Summary of your submission:</strong><br>
          Year / grade: <strong>${grade}</strong><br>
          Exam pathway: <strong>${examPathway}</strong><br>
          Contact email: <strong>${contactEmail}</strong><br>
          Phone: <strong>${phone || "not provided"}</strong>
        </p>
        ${
          message
            ? `<p style="margin-top: 8px; font-size: 14px; color: #4b5563;">
                 <strong>Your notes:</strong><br>${message.replace(/\n/g, "<br>")}
               </p>`
            : ""
        }
        <p style="margin-top: 16px;">
          Kind regards,<br>
          <strong>ABB Tutoring</strong><br>
          Selective · HSC · IB
        </p>
      </div>
    `;

    const parentResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ABB Tutoring <noreply@abbtutoring.org>",
        to: contactEmail,
        subject: "We have received your ABB Tutoring consultation request",
        html: parentHtml,
      }),
    });

    if (!parentResponse.ok) {
      const text = await parentResponse.text();
      console.error("Resend parent email error:", text);
      // We still return success to the frontend, because your copy is the important one
      return res
        .status(200)
        .json({ success: true, warning: "Admin email sent, but parent email failed" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

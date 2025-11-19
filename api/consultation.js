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
      yearLevel,
      examPathway,
      subjects,
      contactEmail,
      phone,
      notes
    } = req.body || {};

    if (!parentName || !studentName || !contactEmail || !yearLevel || !examPathway) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const safeNotes = notes ? String(notes).trim() : "";
    const safeSubjects = subjects ? String(subjects).trim() : "";

    const adminHtml = `
      <h2>New waitlist registration</h2>
      <p><strong>Parent name:</strong> ${parentName}</p>
      <p><strong>Student name:</strong> ${studentName}</p>
      <p><strong>Year level:</strong> ${yearLevel}</p>
      <p><strong>Exam pathway:</strong> ${examPathway}</p>
      <p><strong>Subjects:</strong> ${safeSubjects || "(not specified)"}</p>
      <p><strong>Contact email:</strong> ${contactEmail}</p>
      <p><strong>Phone:</strong> ${phone || "(not provided)"}</p>
      <p><strong>Notes:</strong><br>${safeNotes ? safeNotes.replace(/\n/g, "<br>") : "(none)"}</p>
    `;

    const adminResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "ABB Tutoring <noreply@abbtutoring.org>",
        to: "youremail@example.com", // change this to your real inbox
        subject: "ABB Tutoring waitlist registration",
        html: adminHtml
      })
    });

    if (!adminResponse.ok) {
      const text = await adminResponse.text();
      console.error("Resend admin email error:", text);
      return res.status(500).json({ error: "Failed to send admin email" });
    }

    const parentHtml = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 8px;">Your place on the ABB Tutoring waitlist</h2>
        <p>Dear ${parentName},</p>
        <p>
          Thank you for joining the ABB Tutoring waitlist for <strong>${studentName}</strong>.
          Our current cohort is full and our tutors are off campus, so new places are offered to waitlisted families first.
        </p>
        <p style="margin-top: 12px; font-size: 14px; color: #4b5563;">
          <strong>Your details</strong><br>
          Year level: <strong>${yearLevel}</strong><br>
          Exam pathway: <strong>${examPathway}</strong><br>
          Subjects: <strong>${safeSubjects || "not specified"}</strong><br>
          Contact email: <strong>${contactEmail}</strong><br>
          Phone: <strong>${phone || "not provided"}</strong>
        </p>
        ${safeNotes
          ? `<p style="margin-top: 8px; font-size: 14px; color: #4b5563;">
               <strong>Your notes</strong><br>${safeNotes.replace(/\n/g, "<br>")}
             </p>`
          : ""
        }
        <p style="margin-top: 16px;">
          When tutors return and lesson times open, we will contact families on this list in order of registration.
          You can then decide on lesson times and subjects before we open any remaining places more widely.
        </p>
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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "ABB Tutoring <noreply@abbtutoring.org>",
        to: contactEmail,
        subject: "ABB Tutoring waitlist confirmation",
        html: parentHtml
      })
    });

    if (!parentResponse.ok) {
      const text = await parentResponse.text();
      console.error("Resend parent email error:", text);
      // Do not fail the whole request if parent email fails
      return res.status(200).json({
        success: true,
        warning: "Admin email sent but confirmation email to parent did not send"
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Consultation API error:", err);
    return res.status(500).json({ error: "Unexpected server error" });
  }
}

import nodemailer from "nodemailer";

export const sendFeedback = async (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({ error: "Name, email, and message are required" });
        }

        // Configure your SMTP transporter (Update with actual creds from .env)
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.ethereal.email",
            port: process.env.SMTP_PORT || 587,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Send mail
        const info = await transporter.sendMail({
            from: `"${name}" <${email}>`, // sender address
            to: process.env.ADMIN_EMAIL || "admin@rtct.com", // list of receivers
            subject: "New RTCT Platform Feedback", // Subject line
            text: `You have received new feedback from ${name} (${email}):\n\n${message}`,
            html: `<h3>New Feedback from <b>${name}</b></h3>
             <p><b>Email:</b> ${email}</p>
             <p><b>Message:</b> <br/> ${message}</p>`,
        });

        console.log("Feedback Message sent: %s", info.messageId);

        return res.status(200).json({ success: true, message: "Feedback sent successfully!" });
    } catch (error) {
        console.error("Error sending feedback:", error);
        res.status(500).json({ error: "Failed to send feedback email" });
    }
};

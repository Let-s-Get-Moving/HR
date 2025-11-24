import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.senderEmail = process.env.GMAIL_USER || 'lgmdashboardlgm@gmail.com';
    this.senderName = process.env.GMAIL_SENDER_NAME || 'HR APP';
    this.appPassword = process.env.GMAIL_APP_PASSWORD;
    
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.senderEmail,
        pass: this.appPassword
      }
    });
  }

  async send({ to, subject, textContent, htmlContent }) {
    if (!this.appPassword) {
      console.warn('⚠️  Gmail app password not configured, email skipped');
      return { success: false, reason: 'not_configured' };
    }

    if (!to) {
      console.warn('⚠️  No recipient email, email skipped');
      return { success: false, reason: 'no_recipient' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.senderName}" <${this.senderEmail}>`,
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent || textContent
      });

      console.log(`✅ Email sent to ${to}: ${subject} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

export const emailService = new EmailService();


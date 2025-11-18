import axios from 'axios';

class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@hrapp.com';
    this.senderName = process.env.BREVO_SENDER_NAME || 'HR System';
    this.apiUrl = 'https://api.brevo.com/v3/smtp/email';
  }

  async send({ to, subject, textContent, htmlContent }) {
    if (!this.apiKey) {
      console.warn('⚠️  Brevo API key not configured, email skipped');
      return { success: false, reason: 'not_configured' };
    }

    if (!to) {
      console.warn('⚠️  No recipient email, email skipped');
      return { success: false, reason: 'no_recipient' };
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          sender: { email: this.senderEmail, name: this.senderName },
          to: [{ email: to }],
          subject,
          textContent,
          htmlContent: htmlContent || textContent
        },
        {
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      console.log(`✅ Email sent to ${to}: ${subject}`);
      return { success: true, messageId: response.data.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }
}

export const emailService = new EmailService();


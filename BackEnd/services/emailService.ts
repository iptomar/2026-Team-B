import nodemailer from 'nodemailer';

export const sendPasswordResetEmail = async (toEmail: string, resetToken: string): Promise<void> => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT as string, 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.MAIL_FROM_ADDRESS as string;
    const frontendUrl = process.env.FRONTEND_URL as string;

    if (!host) {
        console.warn('SMTP_HOST is not defined, skipping email sending for:', toEmail);
        return;
    }

    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for port 465, false for 587 and others
        auth: user ? {
            user,
            pass,
        } : undefined,
    });

    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
        from,
        to: toEmail,
        subject: 'Password Recovery Instructions',
        text: `You requested a password reset. Please click on the following link or paste it into your browser to complete the process:\n\n${resetLink}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset</h2>
                <p>You requested a password reset for your account.</p>
                <p>Please click on the button below to complete the process:</p>
                <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent successfully. MsgID: ${info.messageId}`);
    } catch (error) {
        console.error('Failed to send password reset email:', error);
    }
};

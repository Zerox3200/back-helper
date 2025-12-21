import nodemailer from 'nodemailer';

export const SendMail = async ({ to, subject, html }) => {
    const MainSender = nodemailer.createTransport({
        host: "localhost",
        port: 465,
        secure: true,
        service: "gmail",
        auth: {
            user: process.env.Email,
            pass: process.env.Emailpassword
        }
    });
    const emailInfo = await MainSender.sendMail({
        from: process.env.Email,
        to,
        subject,
        html
    });
    if (emailInfo.accepted.length > 0) {
        return true
    }
    return false
}

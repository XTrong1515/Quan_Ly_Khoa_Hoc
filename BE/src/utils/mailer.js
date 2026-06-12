const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_FROM,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendResetPasswordEmail(toEmail, resetUrl) {
  await transporter.sendMail({
    from: `"Hoisted" <${process.env.MAIL_FROM}>`,
    to: toEmail,
    subject: 'Đặt lại mật khẩu — Hoisted',
    html: `
      <div style="font-family:monospace;max-width:480px;margin:0 auto;background:#0B0F19;color:#E2E8F0;padding:32px;border-radius:12px;border:1px solid #1E293B">
        <h2 style="color:#6366F1;margin:0 0 20px;font-size:18px">Hoisted</h2>
        <p style="margin:0 0 12px;line-height:1.6">Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản Hoisted.</p>
        <p style="margin:0 0 24px;color:#94A3B8;line-height:1.6">
          Link dưới đây có hiệu lực trong <strong style="color:#E2E8F0">1 giờ</strong>.
          Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#6366F1;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.02em">
          Đặt lại mật khẩu →
        </a>
        <p style="margin:28px 0 0;font-size:12px;color:#475569;line-height:1.6;word-break:break-all">
          Hoặc copy link: ${resetUrl}
        </p>
      </div>
    `,
    text: `Đặt lại mật khẩu Hoisted\n\nBấm vào link sau để đặt lại mật khẩu (hiệu lực 1 giờ):\n${resetUrl}\n\nNếu bạn không yêu cầu điều này, hãy bỏ qua email này.`,
  });
}

module.exports = { sendResetPasswordEmail };

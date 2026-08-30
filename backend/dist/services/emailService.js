"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordRecoveryEmail = sendPasswordRecoveryEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Configuración de transporte de correo
const createTransporter = async () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (host && user && pass) {
        return nodemailer_1.default.createTransport({
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
        });
    }
    // Fallback a cuenta de prueba Ethereal en desarrollo para no bloquear envíos
    try {
        const testAccount = await nodemailer_1.default.createTestAccount();
        return nodemailer_1.default.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
    catch {
        // Si no hay conexión externa para test account, usa jsonTransport
        return nodemailer_1.default.createTransport({
            jsonTransport: true,
        });
    }
};
async function sendPasswordRecoveryEmail(toEmail, username, code) {
    try {
        const transporter = await createTransporter();
        const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Recuperación TexxxNopor</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #060608;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E2EA;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #060608;
      padding: 40px 0;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #101015;
      border: 1px solid #22222D;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(206, 255, 0, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #181822 0%, #0D0D12 100%);
      padding: 30px 20px;
      text-align: center;
      border-bottom: 1px solid #242432;
    }
    .logo-badge {
      display: inline-block;
      font-size: 28px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: 1px;
    }
    .logo-flame {
      color: #FF2A6D;
    }
    .logo-highlight {
      color: #CEFF00;
    }
    .badge-18 {
      display: inline-block;
      background-color: #E50914;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 4px;
      vertical-align: middle;
      margin-left: 6px;
    }
    .body-content {
      padding: 36px 30px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      color: #FFFFFF;
      margin-bottom: 12px;
    }
    .text {
      font-size: 14px;
      line-height: 1.6;
      color: #A0A0B0;
      margin-bottom: 24px;
    }
    .code-box {
      background: #0A0A0E;
      border: 2px dashed #CEFF00;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 28px 0;
    }
    .code-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #8E8E98;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .code-number {
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #CEFF00;
      font-family: 'Courier New', Courier, monospace;
      margin: 0;
      text-shadow: 0 0 15px rgba(206, 255, 0, 0.4);
    }
    .warning-card {
      background-color: rgba(255, 59, 48, 0.08);
      border-left: 4px solid #FF3B30;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 24px;
    }
    .warning-text {
      font-size: 12px;
      color: #FFA29B;
      margin: 0;
      line-height: 1.5;
    }
    .footer {
      background-color: #0B0B0F;
      padding: 20px;
      text-align: center;
      border-top: 1px solid #1A1A24;
      font-size: 11px;
      color: #666675;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- HEADER -->
      <div class="header">
        <div class="logo-badge">
          <span class="logo-flame">🔥</span> Texxx<span class="logo-highlight">Nopor</span>
          <span class="badge-18">18+</span>
        </div>
      </div>

      <!-- CONTENIDO -->
      <div class="body-content">
        <div class="greeting">Hola, ${username || 'Usuario'}</div>
        <p class="text">
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>TexxxNopor</strong>. 
          Ingresa el siguiente código de verificación de 6 dígitos en tu aplicación para continuar:
        </p>

        <!-- CÓDIGO DE 6 DÍGITOS -->
        <div class="code-box">
          <div class="code-label">Código de Verificación</div>
          <div class="code-number">${code}</div>
        </div>

        <!-- ADVERTENCIA DE SEGURIDAD -->
        <div class="warning-card">
          <p class="warning-text">
            ⚠️ <strong>Importante:</strong> Este código expira en <strong>15 minutos</strong>. Por tu seguridad, nunca compartas este código con nadie.
          </p>
        </div>

        <p class="text" style="margin-bottom: 0;">
          Si tú no solicitaste este cambio, puedes ignorar este mensaje; tu cuenta continuará segura y protegida.
        </p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        © ${new Date().getFullYear()} TexxxNopor Streaming Platform · Plataforma Exclusiva para Adultos (18+)<br>
        Conexión encriptada de alta seguridad SSL/TLS.
      </div>
    </div>
  </div>
</body>
</html>
    `;
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"TexxxNopor Seguridad" <seguridad@texxxnopor.com>',
            to: toEmail,
            subject: `🔑 ${code} es tu código de recuperación de TexxxNopor`,
            text: `Tu código de recuperación para TexxxNopor es: ${code}. Válido por 15 minutos.`,
            html: htmlContent,
        });
        const previewUrl = nodemailer_1.default.getTestMessageUrl(info) || undefined;
        console.log(`📧 [Email] Correo enviado a ${toEmail}. ID: ${info.messageId}`);
        if (previewUrl) {
            console.log(`🔗 [Email Preview]: ${previewUrl}`);
        }
        return { success: true, previewUrl };
    }
    catch (err) {
        console.log(`⚠️ [Email Error] No se pudo enviar el correo a ${toEmail}:`, err.message);
        return { success: false };
    }
}

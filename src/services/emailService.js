const nodemailer = require("nodemailer");

const EMAIL_HOST = process.env.EMAIL_HOST || "smtp.ionos.mx";
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_SECURE = String(process.env.EMAIL_SECURE || "false") === "true";
const EMAIL_USER = process.env.EMAIL_USER || "soporte@spalotus.mx";
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TLS_INSECURE =
  String(process.env.EMAIL_TLS_INSECURE || "false") === "true";
const EMAIL_DISABLED = String(process.env.EMAIL_DISABLED || "false") === "true";

if (!EMAIL_PASS) {
  console.error("❌ EMAIL_PASS no está configurado en el entorno");
}
if (!EMAIL_USER) {
  console.error("❌ EMAIL_USER no está configurado en el entorno");
}

// Configuración del transporter SMTP de IONOS
const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE, // false para STARTTLS en 587
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: EMAIL_TLS_INSECURE ? { rejectUnauthorized: false } : undefined,
  connectionTimeout: 10000,
});

let transporterVerified = false;
async function ensureTransporterVerified() {
  if (transporterVerified) return;
  await transporter.verify();
  transporterVerified = true;
}

/**
 * Envía una alerta por email cuando se registra un nuevo usuario
 * @param {Object} user - Objeto del usuario con email, name y createdAt
 */
async function sendNewUserAlert(user) {
  try {
    if (EMAIL_DISABLED) {
      return;
    }
    if (!EMAIL_USER || !EMAIL_PASS) {
      throw new Error("EMAIL_USER o EMAIL_PASS no configurados");
    }
    await ensureTransporterVerified();
    console.log("Intentando enviar correo de notificación...");
    const registrationDate = user.createdAt
      ? new Date(user.createdAt).toLocaleString("es-MX", {
          dateStyle: "long",
          timeStyle: "short",
        })
      : "No disponible";

    const mailOptions = {
      from: `"Lotus Spa - Sistema" <${EMAIL_USER}>`,
      to: "soporte@spalotus.mx, reservas@spalotus.mx",
      subject: "🌸 Nuevo registro en Lotus Spa",
      text: `Nuevo registro en Lotus Spa\n\nNombre: ${
        user.name || "No especificado"
      }\nEmail: ${user.email}\nFecha de registro: ${registrationDate}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              background-color: #f9f7f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: #ffffff;
              border-radius: 16px;
              box-shadow: 0 4px 20px rgba(185, 124, 139, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #b97c8b 0%, #a05e6a 100%);
              color: #ffffff;
              padding: 32px 24px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: 600;
            }
            .content {
              padding: 32px 24px;
            }
            .info-card {
              background: #f9f7f4;
              border-left: 4px solid #b97c8b;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #f3e6e1;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              font-weight: 600;
              color: #b97c8b;
              min-width: 140px;
            }
            .info-value {
              color: #7a6e63;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #7a6e63;
              font-size: 14px;
              background: #f9f7f4;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌸 Nuevo Registro</h1>
            </div>
            <div class="content">
              <p style="color: #7a6e63; font-size: 16px; margin-top: 0;">
                Se ha registrado un nuevo usuario en la plataforma de Lotus Spa.
              </p>

              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">Nombre:</span>
                  <span class="info-value">${user.name || "No especificado"}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Email:</span>
                  <span class="info-value">${user.email}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Fecha de registro:</span>
                  <span class="info-value">${registrationDate}</span>
                </div>
              </div>

              <p style="color: #7a6e63; font-size: 14px; margin-bottom: 0;">
                Este usuario ahora puede acceder a reservar servicios, editar su perfil y gestionar sus citas.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0;">
                Sistema de notificaciones automáticas · Lotus Spa & Tea
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de nuevo registro enviado: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error al enviar email de registro:", error);
    throw error;
  }
}

module.exports = { sendNewUserAlert };

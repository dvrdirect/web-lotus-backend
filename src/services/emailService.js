const nodemailer = require("nodemailer");

// Configuración del transporter SMTP de IONOS
const transporter = nodemailer.createTransport({
  host: "smtp.ionos.mx",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: "soporte@spalotus.mx",
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envía una alerta por email cuando se registra un nuevo usuario
 * @param {Object} user - Objeto del usuario con email, name y createdAt
 */
async function sendNewUserAlert(user) {
  try {
    const registrationDate = user.createdAt
      ? new Date(user.createdAt).toLocaleString("es-MX", {
          dateStyle: "long",
          timeStyle: "short",
        })
      : "No disponible";

    const mailOptions = {
      from: '"Lotus Spa - Sistema" <soporte@spalotus.mx>',
      to: "soporte@spalotus.mx, reservas@spalotus.mx",
      subject: "🌸 Nuevo registro en Lotus Spa",
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
    // No lanzar el error para que no afecte el flujo de registro
    return { success: false, error: error.message };
  }
}

module.exports = { sendNewUserAlert };

import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const port = Number(process.env.SMTP_PORT) || 2525;
    const secure = process.env.SMTP_SECURE === 'true'; // false para STARTTLS (puerto 2525 o 587)

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private getFromAddress(): string {
    const name = process.env.MAIL_FROM_NAME || 'ExaControl';
    const from =
      process.env.MAIL_FROM ||
      process.env.SMTP_USER ||
      'exacontrolapp@gmail.com';
    return `"${name}" <${from}>`;
  }

  async enviarCredenciales(
    correo: string,
    passwordTemporal: string,
    nombre: string,
  ) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(
        `Simulando envío a ${correo} (Credenciales SMTP no configuradas)`,
      );
      return;
    }

    try {
      const nombreEsc = escapeHtml(nombre);
      const correoEsc = escapeHtml(correo);
      const passEsc = escapeHtml(passwordTemporal);

      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: correo,
        subject: 'Tus credenciales de acceso a ExaControl',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
            <h2 style="color: #003b5c;">¡Bienvenido a ExaControl, ${nombreEsc}!</h2>
            <p>Se te ha creado una cuenta en el sistema de control de ingresos a exámenes.</p>
            <p>Tus credenciales de acceso son las siguientes:</p>
            <ul>
              <li><strong>Usuario:</strong> ${correoEsc}</li>
              <li><strong>Contraseña temporal:</strong> ${passEsc}</li>
            </ul>
            <p><em>Por seguridad, el sistema te solicitará cambiar esta contraseña en tu primer inicio de sesión.</em></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        `,
      });
      this.logger.log(`Correo de credenciales enviado a: ${correo}`);
    } catch (error) {
      console.error('[MailService] Detalle del error SMTP:', error);
      this.logger.error(`Error enviando correo a ${correo}`, error);
      // No lanzamos la excepción para no bloquear la creación del usuario en BD
    }
  }

  async enviarCredencialesEstudiante(
    correo: string,
    passwordTemporal: string,
    nombre: string,
    codSis: string,
  ) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(
        `Simulando envío de credenciales a estudiante ${correo} (SIS: ${codSis}) - SMTP no configurado`,
      );
      return;
    }

    try {
      const nombreEsc = escapeHtml(nombre);
      const codSisEsc = escapeHtml(codSis);
      const correoEsc = escapeHtml(correo);
      const passEsc = escapeHtml(passwordTemporal);

      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: correo,
        subject: 'Tus credenciales de acceso a ExaControl - Estudiante',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
            <h2 style="color: #003b5c;">¡Bienvenido a ExaControl, ${nombreEsc}!</h2>
            <p>Se te ha registrado para rendir exámenes en la UMSS.</p>
            <p>Tus credenciales de acceso al portal de estudiantes son:</p>
            <ul>
              <li><strong>Código SIS:</strong> ${codSisEsc}</li>
              <li><strong>Correo institucional:</strong> ${correoEsc}</li>
              <li><strong>Contraseña temporal:</strong> ${passEsc}</li>
            </ul>
            <p><em>Por seguridad, el sistema te solicitará cambiar tu contraseña y completar tu perfil en tu primer inicio de sesión.</em></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Este es un mensaje automático generado por ExaControl UMSS.</p>
          </div>
        `,
      });
      this.logger.log(`Credenciales enviadas a estudiante: ${correo}`);
    } catch (error) {
      this.logger.error(`Error enviando correo a ${correo}`, error);
      throw error;
    }
  }

  async enviarRecuperacion(correo: string, nombre: string, link: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(
        `Simulando envío de recuperación a ${correo} (Credenciales SMTP no configuradas)`,
      );
      return;
    }

    try {
      const nombreEsc = escapeHtml(nombre);
      await this.transporter.sendMail({
        from: this.getFromAddress(),
        to: correo,
        subject: 'Recuperación de contraseña - ExaControl',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
            <h2 style="color: #003b5c;">Recuperación de contraseña</h2>
            <p>Hola${nombreEsc ? ` ${nombreEsc}` : ''},</p>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en ExaControl.</p>
            <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <p style="margin: 20px 0;">
              <a href="${link}" style="background-color: #003770; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Restablecer contraseña
              </a>
            </p>
            <p>Este enlace expira en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #888;">Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        `,
      });
      this.logger.log(`Correo de recuperación enviado a: ${correo}`);
    } catch (error) {
      console.error('[MailService] Detalle del error SMTP:', error);
      this.logger.error(
        `Error enviando correo de recuperación a ${correo}`,
        error,
      );
    }
  }
}
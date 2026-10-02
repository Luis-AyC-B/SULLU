import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async enviarCredenciales(
    correo: string,
    passwordTemporal: string,
    nombre: string,
  ) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(
        `Simulando envío a ${correo} (Credenciales SMTP no configuradas). Pass: ${passwordTemporal}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"ExaControl UMSS" <${process.env.SMTP_USER}>`,
        to: correo,
        subject: 'Tus credenciales de acceso a ExaControl',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
            <h2 style="color: #003b5c;">¡Bienvenido a ExaControl, ${nombre}!</h2>
            <p>Se te ha creado una cuenta en el sistema de control de ingresos a exámenes.</p>
            <p>Tus credenciales de acceso son las siguientes:</p>
            <ul>
              <li><strong>Usuario:</strong> ${correo}</li>
              <li><strong>Contraseña temporal:</strong> ${passwordTemporal}</li>
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

  async enviarRecuperacion(correo: string, nombre: string, link: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      this.logger.warn(
        `Simulando envío de recuperación a ${correo} (Credenciales SMTP no configuradas). Link: ${link}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"ExaControl UMSS" <${process.env.SMTP_USER}>`,
        to: correo,
        subject: 'Recuperación de contraseña - ExaControl',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
            <h2 style="color: #003b5c;">Recuperación de contraseña</h2>
            <p>Hola${nombre ? ` ${nombre}` : ''},</p>
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

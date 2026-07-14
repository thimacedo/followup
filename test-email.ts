import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('Testing SMTP with:', process.env.EMAIL_SERVER_HOST, process.env.EMAIL_SERVER_USER);
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: Number(process.env.EMAIL_SERVER_PORT),
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_SERVER_USER,
      to: 'thi.macedo@gmail.com',
      subject: 'Teste',
      text: 'Teste',
    });
    console.log('Success:', info.messageId);
  } catch (error) {
    console.error('Error sending email:');
    console.error(error);
  }
}

main();

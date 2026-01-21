import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase/firestore';
import { addContactSubmission } from '@/lib/firebase/firestore';

const RATE_LIMIT_MAP = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS = 3;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = RATE_LIMIT_MAP.get(ip);

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    RATE_LIMIT_MAP.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, company, email, service, budget, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      );
    }

    if (message.length < 10 || message.length > 5000) {
      return NextResponse.json(
        { error: 'Message invalide' },
        { status: 400 }
      );
    }

    await addContactSubmission({
      name,
      company,
      email,
      service,
      budget,
      message,
    });

    if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM) {
      try {
        const nodemailer = await import('nodemailer');

        const transporter = nodemailer.default.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOptions = {
          from: process.env.SMTP_FROM,
          to: process.env.CONTACT_EMAIL,
          subject: `Nouveau message de contact - ${name}`,
          html: `
            <h2>Nouveau message de contact</h2>
            <p><strong>Nom:</strong> ${name}</p>
            ${company ? `<p><strong>Entreprise:</strong> ${company}</p>` : ''}
            <p><strong>Email:</strong> ${email}</p>
            ${service ? `<p><strong>Service:</strong> ${service}</p>` : ''}
            ${budget ? `<p><strong>Budget:</strong> ${budget}</p>` : ''}
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully to:', process.env.CONTACT_EMAIL);
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
      }
    } else {
      console.warn('SMTP not configured - email not sent. Configure SMTP_USER, SMTP_PASS, SMTP_FROM in .env.local');
    }

    return NextResponse.json(
      { message: 'Message envoyé avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

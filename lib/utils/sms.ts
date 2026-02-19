import twilio from "twilio";
import * as Sentry from "@sentry/nextjs";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }
  return twilio(accountSid, authToken);
}

export async function sendSms(params: {
  to: string;
  message: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!fromNumber) throw new Error("TWILIO_FROM_NUMBER not configured");

    const result = await client.messages.create({
      body: params.message,
      from: fromNumber,
      to: params.to,
    });
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error("SMS send error:", err);
    Sentry.captureException(err, { tags: { context: "sms" } });
    return { success: false, error: String(err) };
  }
}

export async function sendWhatsApp(params: {
  to: string;
  message: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const client = getTwilioClient();
    const fromNumber = process.env.TWILIO_WHATSAPP_FROM_NUMBER;
    if (!fromNumber) throw new Error("TWILIO_WHATSAPP_FROM_NUMBER not configured");

    const result = await client.messages.create({
      body: params.message,
      from: fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`,
      to: params.to.startsWith("whatsapp:") ? params.to : `whatsapp:${params.to}`,
    });
    return { success: true, sid: result.sid };
  } catch (err) {
    console.error("WhatsApp send error:", err);
    Sentry.captureException(err, { tags: { context: "sms-whatsapp" } });
    return { success: false, error: String(err) };
  }
}

export type EnquiryErrors = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
};

export const ENQUIRY_MESSAGE_MIN = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+() -]{7,}$/;

export function readFormField(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function isValidPhone(value: string) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && PHONE_PATTERN.test(value);
}

export function validateEnquiry(data: FormData, messageMin = ENQUIRY_MESSAGE_MIN): EnquiryErrors {
  const errors: EnquiryErrors = {};
  const name = readFormField(data, "name");
  const email = readFormField(data, "email");
  const phone = readFormField(data, "phone");
  const message = readFormField(data, "message");

  if (!name) errors.name = "Enter your name.";
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (phone && !isValidPhone(phone)) {
    errors.phone = "Enter at least seven digits using spaces, brackets, plus, or hyphens.";
  }
  if (!message) {
    errors.message = "Enter a message.";
  } else if (message.length < messageMin) {
    errors.message = `Enter at least ${messageMin} characters so we can understand the requirement.`;
  }

  return errors;
}

export function buildEnquiryMailto({
  to,
  subject,
  name,
  email,
  phone,
  application,
  material,
  dimensions,
  volume,
  message,
}: {
  to: string;
  subject: string;
  name: string;
  email: string;
  phone?: string;
  application?: string;
  material?: string;
  dimensions?: string;
  volume?: string;
  message: string;
}) {
  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    ...(phone ? [`Phone: ${phone}`] : []),
    ...(application ? [`Application / use case: ${application}`] : []),
    ...(material ? [`Product / material: ${material}`] : []),
    ...(dimensions ? [`Dimensions: ${dimensions}`] : []),
    ...(volume ? [`Volume / quantity: ${volume}`] : []),
    "",
    message,
  ].join("\n");

  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function submitFormspree(
  formId: string,
  data: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetch(`https://formspree.io/f/${formId}`, {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return {
        ok: false,
        message: "We could not send your enquiry. Email us directly or try again.",
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "We could not send your enquiry. Check your connection and try again.",
    };
  }
}

export type EnquiryErrors = {
  name?: string;
  email?: string;
  message?: string;
};

export function readFormField(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function validateEnquiry(data: FormData, messageMin = 20): EnquiryErrors {
  const errors: EnquiryErrors = {};
  const name = readFormField(data, "name");
  const email = readFormField(data, "email");
  const message = readFormField(data, "message");

  if (!name) errors.name = "Enter your name.";
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
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
  message,
}: {
  to: string;
  subject: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
}) {
  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    ...(phone ? [`Phone: ${phone}`] : []),
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

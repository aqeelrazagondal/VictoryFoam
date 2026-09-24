import assert from "node:assert/strict";
import { test } from "node:test";

import { ENQUIRY_MESSAGE_MIN, isValidPhone, validateEnquiry } from "./enquiry.ts";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

test("positive: a complete enquiry is valid", () => {
  const errors = validateEnquiry(
    form({
      name: "Lebo",
      email: "lebo@example.com",
      message: "Need mattress cores for a 40-unit hotel order.",
    }),
  );
  assert.deepEqual(errors, {});
});

test("negative: a short message is rejected", () => {
  const errors = validateEnquiry(
    form({ name: "Lebo", email: "lebo@example.com", message: "Hello" }),
  );
  assert.match(errors.message ?? "", new RegExp(String(ENQUIRY_MESSAGE_MIN)));
});

test("negative: an invalid email is rejected", () => {
  const errors = validateEnquiry(
    form({
      name: "Lebo",
      email: "not-an-email",
      message: "Need mattress cores for a 40-unit hotel order.",
    }),
  );
  assert.equal(errors.email, "Enter a valid email address.");
});

test("positive: an empty phone is allowed", () => {
  assert.equal(isValidPhone(""), true);
});

test("negative: a phone without enough digits is rejected", () => {
  const errors = validateEnquiry(
    form({
      name: "Lebo",
      email: "lebo@example.com",
      phone: "123",
      message: "Need mattress cores for a 40-unit hotel order.",
    }),
  );
  assert.ok(errors.phone);
});

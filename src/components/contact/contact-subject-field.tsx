"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ContactSubjectFieldInner({ className }: { className: string }) {
  const searchParams = useSearchParams();
  const product = searchParams.get("product");
  const [subject, setSubject] = useState(product ? `Quote request for ${product}` : "");

  return (
    <input
      id="contact-subject"
      className={className}
      name="subject"
      value={subject}
      onChange={(event) => setSubject(event.target.value)}
    />
  );
}

function ContactSubjectFieldFallback({ className }: { className: string }) {
  return (
    <input
      id="contact-subject"
      className={className}
      name="subject"
      defaultValue=""
    />
  );
}

export function ContactSubjectField({ className }: { className: string }) {
  return (
    <Suspense fallback={<ContactSubjectFieldFallback className={className} />}>
      <ContactSubjectFieldInner className={className} />
    </Suspense>
  );
}

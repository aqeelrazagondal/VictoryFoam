"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function PathRedirect({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <div className="space-y-4">
      <h1>{title}</h1>
      <p className="text-muted-foreground">{description}</p>
      <p>
        <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
          Open {title}
        </Link>
      </p>
    </div>
  );
}

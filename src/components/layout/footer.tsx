import {
  BriefcaseBusiness,
  Camera,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import Link from "next/link";

import { TrackedAnchor } from "@/components/analytics/tracked-link";
import { CookiePreferences } from "@/components/analytics/cookie-preferences";
import { categories } from "@/data/categories";
import { company, navigation } from "@/data/company";
import { toTelHref } from "@/lib/utils";

const socialIcons = {
  LinkedIn: BriefcaseBusiness,
  Facebook: MessageCircle,
  Instagram: Camera,
};

export function Footer() {
  return (
    <footer id="site-footer" className="bg-slate-950 text-slate-300">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="container-site grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-heading text-xl font-semibold text-white">{company.name}</p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{company.description}</p>
          <div className="mt-5 flex gap-2">
            {company.socialLinks.map((social) => {
              const Icon = socialIcons[social.platform as keyof typeof socialIcons];
              return (
                <a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.platform}
                  className="grid size-11 place-items-center rounded-lg border border-slate-700 transition-[color,border-color,box-shadow] hover:border-sky-400 hover:text-sky-400 hover:glow-sm"
                >
                  {Icon && <Icon className="size-4" />}
                </a>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="font-heading text-sm font-semibold text-white">
            Products
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {categories.map((category) => (
              <li key={category.slug}>
                <Link className="hover:text-sky-400" href={`/products/#${category.slug}`}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-heading text-sm font-semibold text-white">
            Company
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            {navigation.slice(1).map((item) => (
              <li key={item.href}>
                <Link className="hover:text-sky-400" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-heading text-sm font-semibold text-white">
            Contact
          </h2>
          <ul className="mt-4 space-y-4 text-sm">
            <li className="flex gap-3">
              <Phone className="mt-0.5 size-4 shrink-0 text-sky-400" />
              <TrackedAnchor
                href={toTelHref(company.phone)}
                linkType="phone"
                className="underline-offset-2 hover:underline"
              >
                {company.phone}
              </TrackedAnchor>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-sky-400" />
              <TrackedAnchor
                href={`mailto:${company.email}`}
                linkType="email"
                className="underline-offset-2 hover:underline"
              >
                {company.email}
              </TrackedAnchor>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-sky-400" />
              <address className="not-italic">
                {company.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </li>
          </ul>
          <p className="mt-5 text-xs text-slate-400">{company.workingHours}</p>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="container-site flex flex-col gap-3 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {company.name}. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-4">
            <Link className="hover:text-sky-400" href="/privacy/">
              Privacy Policy
            </Link>
            <Link className="hover:text-sky-400" href="/terms/">
              Terms of Use
            </Link>
            <CookiePreferences />
          </nav>
        </div>
      </div>
    </footer>
  );
}

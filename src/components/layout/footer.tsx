import {
  BriefcaseBusiness,
  Camera,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import Link from "next/link";

import { categories } from "@/data/categories";
import { company, navigation } from "@/data/company";

const socialIcons = {
  LinkedIn: BriefcaseBusiness,
  Facebook: MessageCircle,
  Instagram: Camera,
};

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300">
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
                  className="grid size-10 place-items-center rounded-lg border border-slate-700 transition-[color,border-color,box-shadow] hover:border-sky-400 hover:text-sky-400 hover:glow-sm"
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
              <a href={`tel:${company.phone.replace(/[^\d+]/g, "")}`}>{company.phone}</a>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-0.5 size-4 shrink-0 text-sky-400" />
              <a href={`mailto:${company.email}`}>{company.email}</a>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-sky-400" />
              <span>{company.address}</span>
            </li>
          </ul>
          <p className="mt-5 text-xs text-slate-400">{company.workingHours}</p>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="container-site py-5 text-xs text-slate-400">
          © 2026 {company.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

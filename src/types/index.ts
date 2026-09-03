export interface Product {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  gallery?: string[];
  specs: {
    label: string;
    value: string;
  }[];
  features: string[];
  certifications?: string[];
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  image: string;
}

export interface CompanyInfo {
  name: string;
  tagline: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  postalAddress: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  workingHours: string;
  openingHours: string;
  mapEmbedUrl: string;
  socialLinks: {
    platform: string;
    url: string;
  }[];
}

export interface Certification {
  name: string;
  image: string;
  description: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
  type: "factory" | "product" | "process";
}

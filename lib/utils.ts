import { type ClassValue, clsx } from "clsx";
import { Metadata } from "next";
import { twMerge } from 'tailwind-merge';
import { siteConfig } from "./config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL || siteConfig.url}${path}`;
}

export function constructMetadata({
  title = siteConfig.name,
  description = siteConfig.description,
  image = absoluteUrl("/og"),
  ...props
}: {
  title?: string;
  description?: string;
  image?: string;
  [key: string]: Metadata[keyof Metadata];
}): Metadata {
  return {
    title: {
      template: "%s | " + siteConfig.name,
      default: siteConfig.name,
    },
    description: description || siteConfig.description,
    keywords: siteConfig.keywords,
    openGraph: {
      title,
      description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
      locale: "en_US",
    },
    icons: "/favicon.ico",
    metadataBase: new URL(siteConfig.url),
    authors: [
      {
        name: siteConfig.name,
        url: siteConfig.url,
      },
    ],
    ...props,
  };
}

export function formatDate(date: string) {
  let currentDate = new Date().getTime();
  if (!date.includes("T")) {
    date = `${date}T00:00:00`;
  }
  let targetDate = new Date(date).getTime();
  let timeDifference = Math.abs(currentDate - targetDate);
  let daysAgo = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  let fullDate = new Date(date).toLocaleString("en-us", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  if (daysAgo < 1) {
    return "Today";
  } else if (daysAgo < 7) {
    return `${fullDate} (${daysAgo}d ago)`;
  } else if (daysAgo < 30) {
    const weeksAgo = Math.floor(daysAgo / 7);
    return `${fullDate} (${weeksAgo}w ago)`;
  } else if (daysAgo < 365) {
    const monthsAgo = Math.floor(daysAgo / 30);
    return `${fullDate} (${monthsAgo}mo ago)`;
  } else {
    const yearsAgo = Math.floor(daysAgo / 365);
    return `${fullDate} (${yearsAgo}y ago)`;
  }
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function calculateAge(dob: string | Date): number {
  let birthDate: Date;

  if (typeof dob === "string") {
    // Support both 'YYYY-MM-DD' and ISO format strings
    if (!dob.includes("T")) {
      dob = `${dob}T00:00:00`;
    }
    birthDate = new Date(dob);
  } else {
    birthDate = dob;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();

  // Adjust age if birthday not reached yet this year
  const thisYearBirthday = new Date(
    today.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  );
  if (today < thisYearBirthday) {
    age--;
  }

  return age;
}

export function fmtDate(iso?: string): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export function fmtTime(iso?: string): string {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
export function fmtFull(iso?: string): string {
    if (!iso) return "—";
    return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

export function calcAge(dob?: string): string {
    if (!dob) return "";
    const d   = new Date(dob);
    const now = new Date();
    let   yrs = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) yrs--;
    return yrs < 2 ? `${yrs * 12 + now.getMonth() - d.getMonth()} months` : `${yrs} years`;
}

export function stripRadiologyPrefix(testType: string): string {
    return (testType ?? "").replace(/^\[RADIOLOGY\]\s*/, "");
}

// ─── Allergy detection ────────────────────────────────────────────────────────

/**
 * Free-text values commonly used to indicate the ABSENCE of a documented
 * allergy on legacy patient records. Anything matching one of these should NOT
 * trigger an allergy alert. Values are compared after lowercasing and stripping
 * all punctuation/whitespace.
 */
const NO_ALLERGY_MARKERS = new Set([
    "none",
    "nil",
    "no",
    "na", // "N/A", "NA"
    "nka", // no known allergies
    "nkda", // no known drug allergies
    "nkfa", // no known food allergies
    "noneknown",
    "notknown",
    "noknown",
    "noknownallergies",
    "noknowndrugallergies",
    "noknowndrugallergy",
    "noknownfoodallergies",
    "noknownfoodallergy",
    "noallergies",
    "noallergy",
    "noknownallergy",
    "noneknownallergies",
    "noallergichistory",
    "deniesallergies",
    "negative",
    "unknown",
    "nonenoted",
    "noneallergic",
    "notallergic",
    "notapplicable",
]);

/**
 * True when the given free-text allergies field describes an actual allergy
 * (e.g. "Penicillin", "Peanuts") rather than the absence of one ("none", "N/A",
 * "no known drug allergies", etc.). Used to decide whether an allergy alert
 * should be shown for legacy patient records.
 */
export function hasActualAllergy(value?: string | null): boolean {
    if (value == null) return false;
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    if (!normalized) return false;
    return !NO_ALLERGY_MARKERS.has(normalized);
}

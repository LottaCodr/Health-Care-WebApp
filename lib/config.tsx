export const BLUR_FADE_DELAY = 0.15;




export const siteConfig = {
    name: "Nile Valley Hospital",
    description: "Nile Valley Hospital",
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    keywords: ["SaaS", "Template", "Next.js", "React", "Tailwind CSS"],
    links: {
        email: "[EMAIL_ADDRESS]",
        twitter: "https://twitter.com/codehagen",
        discord: "https://discord.gg/87p2vpsat5",
        github: "https://github.com/codehagen",
        instagram: "https://instagram.com/codehagen/",
    },



};

export type SiteConfig = typeof siteConfig;
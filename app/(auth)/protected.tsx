"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { account } from "@/lib/appwrite.config";
import { Models } from "appwrite"; // import Appwrite's User type

export default function ProtectedRedirect({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkSession = async () => {
            try {
                const user: Models.User<Models.Preferences> = await account.get();

                const role = user?.prefs?.role;
                const full_name = user?.prefs?.full_name;

                console.log("✅ Role:", role);
                console.log("👤 User prefs:", user.prefs);

                // Redirect based on role if on public route
                const isPublic = ["/", "/staff"].includes(pathname);
                if (isPublic) {
                    switch (role) {
                        case "doctor":
                            router.replace("/doctor/dashboard");
                            break;
                        case "nurse":
                            router.replace("/nurse/dashboard");
                            break;
                        case "pharmacist":
                            router.replace("/pharmacist/dashboard");
                            break;
                        case "lab-tech":
                            router.replace("/lab-tech/dashboard");
                            break;
                        case "front-desk":
                            router.replace("/front-desk/dashboard");
                            break;
                        default:
                            router.replace("/staff");
                            break;
                    }
                }
            } catch (error) {
                // Not logged in: redirect from protected routes
                const publicRoutes = ["/", "/staff"];
                if (!publicRoutes.includes(pathname)) {
                    router.replace("/staff");
                }
            }
        };

        checkSession();
    }, [pathname, router]);

    return <>{children}</>;
}

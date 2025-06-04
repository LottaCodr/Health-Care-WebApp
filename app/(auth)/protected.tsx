"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { account } from "@/lib/appwrite.config";
import type { MyUser } from '@/app/context/auth-provider'; // custom interface

export default function ProtectedRedirect({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkSession = async () => {
            try {
                const user = await account.get();

                const myUser: MyUser = {
                    $id: user.$id,
                    name: user.name,
                    email: user.email,
                    role: user.prefs.role,
                };
                const role = user?.prefs.role
                console.log('role', role)
                console.log('user refs', myUser)
                // Redirect if on public page
                if (pathname === "/" || pathname === "/staff") {
                    switch (myUser.role) {
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
                            router.replace('/lab-tech/dashboard');
                            break;
                        case "front-desk":
                            router.replace("/front-desk/dashboard")
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

    // Render children so protected content is shown if not redirected
    return <>{children}</>;
}

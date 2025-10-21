import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // safe for login
);

export const authOptions = {
    providers: [
        CredentialsProvider({
            name: "Supabase",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) return null;

                // Login with Supabase
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: credentials.email,
                    password: credentials.password,
                });

                if (error || !data.user) {
                    console.error("Supabase login failed:", error?.message);
                    return null;
                }

                // Fetch role from staff table
                const { data: staffProfile } = await supabase
                    .from("staff")
                    .select("id, email, role, name")
                    .eq("id", data.user.id)
                    .single();

                return {
                    id: data.user.id,
                    email: data.user.email,
                    role: staffProfile?.role || "staff",
                    name: staffProfile?.name || data.user.email,
                };
            },
        }),
    ],
    session: { strategy: "jwt" },
    callbacks: {
        async jwt({ token, user }: { token: any; user?: any }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.role = user.role;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            session.user.id = token.id;
            session.user.email = token.email;
            session.user.role = token.role;
            session.user.name = token.name;
            return session;
        },
    },
    pages: {
        signIn: "/staff", // custom login page
    },
};

const handler = NextAuth({
    ...authOptions,
    session: { strategy: "jwt" as const },
});

export { handler as GET, handler as POST };

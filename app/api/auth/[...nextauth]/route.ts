// /app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { account, databases, DATABASE_ID, STAFF_COLLECTION_ID } from "@/lib/appwrite.config";


declare module "next-auth" {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            id?: string;
        };
    }
    interface User {
        role?: string;
        id?: string;
    }
}

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
                role: { label: "Role", type: "text" }
            },
            async authorize(credentials) {
                try {
                    // Login with Appwrite
                    await account.createEmailPasswordSession(credentials!.email, credentials!.password);

                    // Get logged-in user
                    const user = await account.get();
                    const userDoc = await databases.getDocument(DATABASE_ID!, STAFF_COLLECTION_ID!, user.$id);

                    return {
                        id: user.$id,
                        email: user.email,
                        role: userDoc.role,
                    };
                } catch (error) {
                    console.error("Login failed", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            session.user.role = token.role as string | undefined;
            session.user.id = token.id as string | undefined;
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
    },
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login", // Optional: custom login page
    },
});

export { handler as GET, handler as POST };

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { account, databases } from "@/lib/appwrite.config";

export const AuthService = {
    async authenticateUser(email: string, password: string) {
        await account.createEmailPasswordSession(email, password);
        const jwt = await account.createJWT();
        const user = await account.get();

        return {
            ...user,
            jwt: jwt.jwt,
        };
    },

    async getUserDetails(userId: string) {
        return databases.getDocument(
            process.env.NEXT_PUBLIC_DATABASE_ID!,
            process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!,
            userId
        );
    },
};

const handler = NextAuth({
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const email = credentials?.email;
                const password = credentials?.password;

                if (!email || !password) {
                    console.error("Authorization failed: Missing credentials");
                    return null;
                }

                try {
                    const user = await AuthService.authenticateUser(email, password);
                    const userDetails = await AuthService.getUserDetails(user.$id);

                    if (!userDetails?.role) {
                        throw new Error("Role not found for user");
                    }

                    return {
                        id: user.$id,
                        name: user.name,
                        email: user.email,
                        role: userDetails.role,
                    };
                } catch (error) {
                    console.error("Authentication error:", error);
                    return null;
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },

    session: {
        strategy: "jwt",
    },

    pages: {
        signIn: "/staff",
    },

    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };

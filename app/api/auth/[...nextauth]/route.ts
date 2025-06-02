import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { account, databases } from "@/lib/appwrite.config";

const AuthService = {
    async authenticateUser(email: string, password: string) {
        await account.deleteSession("current")
        await account.createEmailPasswordSession(email, password);
        return await account.get();
    },
    async getUserDetails(userId: string) {
        return await databases.getDocument(
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
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    return null;
                }
                try {
                    const user = await AuthService.authenticateUser(
                        credentials.email,
                        credentials.password
                    );
                    const userDetails = await AuthService.getUserDetails(user.$id);

                    if (!userDetails?.role) {
                        throw new Error("No role found");
                    }

                    return {
                        id: user.$id,
                        name: user.name,
                        email: user.email,
                        role: userDetails.role,
                    };
                } catch {
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

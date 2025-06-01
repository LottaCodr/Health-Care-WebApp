import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { account, databases, DATABASE_ID, STAFF_COLLECTION_ID } from "@/lib/appwrite.config";
import { AuthError } from "@/types/errors";

// Authentication service layer
const AuthService = {
    async authenticateUser(email: string, password: string) {
        try {
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();

            if (!user.$id) {
                throw new AuthError('User authentication failed');
            }

            return user;
        } catch (error) {
            throw new AuthError('Authentication failed');
        }
    },

    async getUserDetails(userId: string) {
        try {
            const userDoc = await databases.getDocument(
                DATABASE_ID!,
                STAFF_COLLECTION_ID!,
                userId
            );

            if (!userDoc || !userDoc.role) {
                throw new AuthError('User role not found');
            }

            return userDoc;
        } catch (error) {
            throw new AuthError('Failed to fetch user details');
        }
    }
};

const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials.password) {
                    console.log("Missing credentials");

                    return null;
                }
                console.log("credential email", credentials.email)
                console.log("credential password", credentials.password)

                

                try {

                    console.log("🔐 Attempting Appwrite auth...");

                    // Authenticate user
                    const user = await AuthService.authenticateUser(
                        credentials.email,
                        credentials.password
                    );
                    console.log('user auth', user)
                    // Get user details including role
                    const userDetails = await AuthService.getUserDetails(user.$id);
                    console.log("📄 Appwrite DB user details:", userDetails);


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
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 60 * 60 * 24, // 1 day
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/staff",
    },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

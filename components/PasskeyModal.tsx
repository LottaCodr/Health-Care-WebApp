"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { loginStaff } from "@/actions/login";
import { signIn } from "next-auth/react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const StaffLogin = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });


  const onSubmit = async (values: LoginFormValues) => {
          // const result = await loginStaff(values.email, values.password);
  
          const res = await signIn("credentials", {
              email: values.email,
              password: values.password,
              redirect: false,
          });
  
          console.log('response', res)
  
          if (res?.ok) {
              // After successful sign-in, fetch the user's role from your backend or session
              // Example: fetch role from an API endpoint
              try {
                  const response = await fetch("/api/user/role", { method: "GET" });
                  const data = await response.json();
                  const role = data.role as string | undefined;
  
                  toast.toast({
                      title: "Login successful",
                      description: role
                          ? `Welcome, ${role.charAt(0).toUpperCase() + role.slice(1)}!`
                          : "Welcome!",
                      variant: "default",
                  });
  
                  if (role === "doctor") {
                      router.replace("/doctor/dashboard");
                  } else if (role === "lab-tech") {
                      router.replace("/lab-tech/dashboard");
                  } else if (role === "nurse") {
                      router.replace("/nurse/dashboard");
                  } else if (role === "pharmacist") {
                      router.replace("/pharmacist/dashboard");
                  } else if (role === "admin") {
                      router.replace("/admin");
                  } else {
                      alert("Unknown role.");
                  }
              } catch (error) {
                  alert("Failed to fetch user role.");
              }
          } else {
              alert("Login failed. Please try again.");
          }
      };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex justify-between items-center">
            Staff Login
            <Image
              src="/assets/icons/close.svg"
              alt="Close"
              width={20}
              height={20}
              onClick={() => setIsOpen(false)}
              className="cursor-pointer hover:opacity-80"
            />
          </AlertDialogTitle>
          <AlertDialogDescription>
            Enter your credentials to access the staff dashboard.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="staff@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-3 text-sm text-gray-500"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default StaffLogin;

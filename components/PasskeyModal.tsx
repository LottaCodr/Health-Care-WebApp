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

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const StaffLogin = () => {
  const [isOpen, setIsOpen] = useState(true);
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

    const res = await loginStaff(values.email, values.password);

    console.log('this is the user doc', res)

    if (res.role) {
      
      const formattedRole =
        String(res.role).charAt(0).toUpperCase() + String(res.role).slice(1);

      toast.toast({
        title: `Login successful`,
        description: `Welcome, ${formattedRole}`,
      });

      const roleToPath = {
        doctor: "/doctor/dashboard",
        nurse: "/nurse/dashboard",
        "lab-tech": "/lab-tech/dashboard",
        pharmacist: "/pharmacist/dashboard",
        admin: "/admin",
      };

      const redirectTo = roleToPath[res.role as unknown as keyof typeof roleToPath];

      if (redirectTo) {
        router.replace(redirectTo);
      } else {
        toast.toast({
          title: "Unknown role",
          description: "Please contact the system administrator.",
          variant: "default",
        });
      }
    } else {
      toast.toast({
        title: "Login failed",
        description: "Please check your credentials.",
        variant: "destructive",
      });
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
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...field}
                    />
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

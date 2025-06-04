import Image from "next/image";
import Link from "next/link";

import PatientForm from "@/components/forms/PatientForm";



export default function Home() {

  return (
    <div className="relative flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300 dark:bg-zinc-950 dark:text-white">

      {/* Left Section - Form */}
      <section className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-1/2 lg:px-20 xl:px-28">
        <div className="mx-auto w-full min-h-screen max-w-md">
          {/* Logo */}
          <Image
            src="/assets/icons/logo-full.svg"
            alt="Nile Hospital Logo"
            width={160}
            height={40}
            className="mb-12"
            priority
          />

          {/* Patient Form */}
          <PatientForm />

          {/* Footer */}
          <div className="mt-16 flex items-center justify-between text-sm text-muted-foreground">
            <p>&copy; 2025 Nile Mother & Child Hospital</p>
            <Link
              href="/staff"
              className="text-green-600 underline-offset-4 hover:underline dark:text-green-400"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </section>

      {/* Right Section - Image */}
      <div className="hidden h-full w-1/2 items-center justify-center bg-muted lg:flex">
        <Image
          src="/assets/images/onboarding-img.png"
          alt="Onboarding Illustration"
          width={600}
          height={600}
          className="max-w-full object-contain"
        />
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { FaUserMd } from "react-icons/fa";
import { MdOutlineLogin } from "react-icons/md";
import PatientForm from "@/components/forms/PatientForm";

export default function Home() {
  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 transition-colors duration-300">
      {/* Left Section - Form */}
      <section className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-1/2 lg:px-20 xl:px-28 bg-white/90 dark:bg-zinc-950/80 shadow-2xl z-10">
        <div className="mx-auto w-full min-h-screen max-w-md flex flex-col justify-center">
          {/* Logo & Welcome */}
          <div className="flex flex-col items-center mb-10">
            <Image
              src="/assets/icons/logo-full.svg"
              alt="Nile Hospital Logo"
              width={180}
              height={48}
              className="mb-6 drop-shadow-lg"
              priority
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-red-700 mb-2 tracking-tight text-center">
              Welcome to Nile Valley Mother & Child Hospital
            </h1>
            <p className="text-base text-red-500 mb-4 text-center">
              Please fill out the patient form to get started.
            </p>
          </div>

          {/* Patient Form */}
          <div className="rounded-2xl shadow-lg border border-red-100 bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-zinc-900 dark:to-zinc-950 p-6">
            <PatientForm />
          </div>

          {/* Footer */}
          <div className="mt-12 flex items-center justify-between text-sm text-red-400">
            <p>
              &copy; {new Date().getFullYear()}{" "}
              <span className="font-semibold text-red-600">
                Nile Mother & Child Hospital
              </span>
            </p>
            <Link
              href="/staff"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-red-200 bg-red-50 text-red-700 font-medium hover:bg-red-100 hover:text-red-900 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-zinc-900 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-800/30"
            >
              <MdOutlineLogin className="text-lg" />
              Staff Login
            </Link>
          </div>
        </div>
      </section>

      {/* Right Section - Image & Accent */}
      <div className="hidden h-full w-1/2 items-center justify-center relative lg:flex">
        {/* Decorative Red Accent */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-red-100/60 via-red-200/40 to-white/0 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
          <Image
            src="/assets/images/onboarding-img.png"
            alt="Onboarding Illustration"
            width={520}
            height={520}
            className="max-w-full object-contain drop-shadow-2xl rounded-2xl border-2 border-red-100"
            priority
          />
          <div className="mt-8 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-xl shadow border border-red-100">
              <FaUserMd className="text-red-600 text-2xl" />
              <span className="text-lg font-semibold text-red-700">
                Compassionate Care, Always
              </span>
            </div>
            <p className="mt-3 text-red-500 text-sm text-center max-w-xs">
              Your health and comfort are our top priorities. We’re here for you every step of the way.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

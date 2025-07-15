import Image from "next/image";
import Link from "next/link";
import { FaUserMd } from "react-icons/fa";
import { MdOutlineLogin } from "react-icons/md";
import PatientForm from "@/components/forms/PatientForm";

export default function Home() {
  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900 transition-colors duration-300">
      {/* Left Section - Form */}
      <section className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-1/2 lg:px-20 xl:px-28 bg-white/95 dark:bg-zinc-950/90 shadow-2xl z-10">
        <div className="mx-auto w-full min-h-screen max-w-md flex flex-col justify-center">
          {/* Logo & Welcome */}
          <div className="flex flex-col items-center mb-10">
            <Image
              src="/assets/icons/logo-full.svg"
              alt="Nile Hospital Logo"
              width={200}
              height={54}
              className="mb-8 drop-shadow-xl animate-fade-in"
              priority
            />
            <h1 className="text-3xl sm:text-4xl font-extrabold text-red-700 mb-2 tracking-tight text-center drop-shadow">
              Welcome to Nile Valley Mother & Child Hospital
            </h1>
            <p className="text-base sm:text-lg text-red-500 mb-4 text-center font-medium">
              Please fill out the patient form to get started.
            </p>
          </div>

          {/* Patient Form */}
          <div className="rounded-3xl shadow-2xl border border-red-100 bg-gradient-to-br from-white via-red-50 to-red-100 dark:from-zinc-900 dark:to-zinc-950 p-8 transition-all hover:shadow-red-200/60 hover:scale-[1.01] duration-200">
            <PatientForm />
          </div>

          {/* Footer */}
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-red-400 gap-4">
            <p className="text-center sm:text-left">
              &copy; {new Date().getFullYear()}{" "}
              <span className="font-semibold text-red-600">
                Nile Mother & Child Hospital
              </span>
            </p>
            <Link
              href="/staff"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 font-semibold shadow-sm hover:bg-red-100 hover:text-red-900 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-zinc-900 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-800/30"
              aria-label="Staff Login"
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
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-red-100/70 via-red-200/50 to-white/0 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
          <div className="animate-fade-in-up">
            <Image
              src="/assets/images/onboarding-img.png"
              alt="Onboarding Illustration"
              width={520}
              height={520}
              className="max-w-full object-contain drop-shadow-2xl rounded-3xl border-2 border-red-100"
              priority
            />
          </div>
          <div className="mt-10 flex flex-col items-center">
            <div className="inline-flex items-center gap-3 bg-white/90 px-6 py-3 rounded-2xl shadow-lg border border-red-100 backdrop-blur-md">
              <FaUserMd className="text-red-600 text-2xl animate-pulse" />
              <span className="text-xl font-bold text-red-700 tracking-tight">
                Compassionate Care, Always
              </span>
            </div>
            <p className="mt-4 text-red-500 text-base text-center max-w-xs font-medium">
              Your health and comfort are our top priorities.<br className="hidden sm:inline" /> We’re here for you every step of the way.
            </p>
          </div>
        </div>
      </div>

      {/* Subtle animated accent for extra delight */}
      <div className="pointer-events-none absolute left-0 top-0 w-72 h-72 bg-pink-200/30 rounded-full blur-3xl opacity-60 animate-float-slow -z-10" />
      <div className="pointer-events-none absolute right-0 bottom-0 w-96 h-96 bg-red-100/40 rounded-full blur-3xl opacity-50 animate-float-slower -z-10" />
    </div>
  );
}

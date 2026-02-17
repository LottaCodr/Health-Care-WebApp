import Image from "next/image";
import Link from "next/link";
import { FaUserMd } from "react-icons/fa";
import { MdOutlineLogin } from "react-icons/md";
import PatientForm from "@/components/forms/PatientForm";
import LoginScreen from "./(public)/staff/staff-login";

export default function Home() {
  return (
    <LoginScreen/>
  );
}


// "use server"
// import { createClient } from "@supabase/supabase-js";
// import { parseStringify } from "@/app/lib/utils";
// import { RegisterUserParams } from "@/types";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// const supabase = createClient(supabaseUrl, supabaseKey);

// export const registerPatient = async (patient: RegisterUserParams) => {
//   try {
//     const { data, error } = await supabase
//       .from("patients")
//       .insert([{ ...patient }])
//       .select()
//       .single();

//     if (error) throw error;

//     return parseStringify(data);
//   } catch (error) {
//     console.log("An error occurred while registering the patient:", error);
//   }
// };

// export const getPatient = async (userId: string) => {
//   try {
//     const { data, error } = await supabase
//       .from("patients")
//       .select("*")
//       .eq("userId", userId)
//       .maybeSingle();

//     if (error) throw error;

//     return parseStringify(data);
//   } catch (error) {
//     console.log("An error occurred while getting a user:", error);
//   }
// };


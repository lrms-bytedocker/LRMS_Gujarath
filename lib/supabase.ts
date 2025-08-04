import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//const supabaseUrl = 'https://qephpgclvsryatnkaxis.supabase.co'
//const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFlcGhwZ2NsdnNyeWF0bmtheGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MjI2MDksImV4cCI6MjA2OTA5ODYwOX0.kyiUa3s2h4KQWYNkh6ELUPTfQvdi3lbMG1duRz3VFOs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Area conversion utilities
export function convertToSquareMeters(value: number, unit: "acre" | "guntha" | "sq_m"): number {
  switch (unit) {
    case "acre":
      return value * 4046.86 // 1 acre = 4046.86 sq meters
    case "guntha":
      return value * 101.17 // 1 guntha = 101.17 sq meters
    case "sq_m":
      return value
    default:
      return value
  }
}

export function convertFromSquareMeters(sqMeters: number, targetUnit: "acre" | "guntha" | "sq_m"): number {
  switch (targetUnit) {
    case "acre":
      return sqMeters / 4046.86
    case "guntha":
      return sqMeters / 101.17
    case "sq_m":
      return sqMeters
    default:
      return sqMeters
  }
}

// File upload utility
export async function uploadFile(file: File, bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file)

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path)

  return publicUrl
}

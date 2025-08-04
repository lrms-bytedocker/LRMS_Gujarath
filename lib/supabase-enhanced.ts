import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions
export interface LandRecordData {
  id?: string
  district: string
  taluka: string
  village: string
  area_value: number
  area_unit: string
  s_no_type: string
  s_no: string
  is_promulgation: boolean
  block_no?: string
  re_survey_no?: string
  integrated_712?: string
  status?: string
  current_step?: number
}

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
export async function uploadFile(file: File, bucket: string = "land-documents"): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

// Database operations
export class LandRecordService {
  // Create or update land record
  static async saveLandRecord(data: LandRecordData): Promise<{ data: any, error: any }> {
    try {
      if (data.id) {
        // Update existing record
        const { data: result, error } = await supabase
          .from('land_records')
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', data.id)
          .select()
          .single()
        
        return { data: result, error }
      } else {
        // Create new record
        const { data: result, error } = await supabase
          .from('land_records')
          .insert([data])
          .select()
          .single()
        
        return { data: result, error }
      }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get land record by ID
  static async getLandRecord(id: string): Promise<{ data: any, error: any }> {
    const { data, error } = await supabase
      .from('land_records')
      .select('*')
      .eq('id', id)
      .single()
    
    return { data, error }
  }

  // Save year slabs
  static async saveYearSlabs(landRecordId: string, yearSlabs: any[]): Promise<{ data: any, error: any }> {
    try {
      // First, delete existing year slabs for this land record
      await supabase
        .from('year_slabs')
        .delete()
        .eq('land_record_id', landRecordId)

      // Insert new year slabs
      const slabsToInsert = yearSlabs.map(slab => ({
        land_record_id: landRecordId,
        start_year: slab.startYear,
        end_year: slab.endYear,
        s_no: slab.sNo,
        integrated_712: slab.integrated712,
        paiky: slab.paiky,
        paiky_count: slab.paikyCount,
        ekatrikaran: slab.ekatrikaran,
        ekatrikaran_count: slab.ekatrikaranCount
      }))

      const { data, error } = await supabase
        .from('year_slabs')
        .insert(slabsToInsert)
        .select()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Save nondhs
  static async saveNondhs(landRecordId: string, nondhs: any[]): Promise<{ data: any, error: any }> {
    try {
      // First, delete existing nondhs for this land record
      await supabase
        .from('nondhs')
        .delete()
        .eq('land_record_id', landRecordId)

      // Insert new nondhs
      const nondhsToInsert = nondhs.map(nondh => ({
        land_record_id: landRecordId,
        number: nondh.number,
        s_no_type: nondh.sNoType,
        affected_s_nos: nondh.affectedSNos,
        nondh_doc_url: nondh.nondhDoc
      }))

      const { data, error } = await supabase
        .from('nondhs')
        .insert(nondhsToInsert)
        .select()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Get all data for a land record
  static async getCompleteRecord(landRecordId: string): Promise<{ data: any, error: any }> {
    try {
      const { data: landRecord, error: landError } = await supabase
        .from('land_records')
        .select('*')
        .eq('id', landRecordId)
        .single()

      if (landError) return { data: null, error: landError }

      const { data: yearSlabs, error: slabsError } = await supabase
        .from('year_slabs')
        .select('*')
        .eq('land_record_id', landRecordId)

      const { data: nondhs, error: nondhsError } = await supabase
        .from('nondhs')
        .select('*')
        .eq('land_record_id', landRecordId)

      return {
        data: {
          landRecord,
          yearSlabs: yearSlabs || [],
          nondhs: nondhs || []
        },
        error: null
      }
    } catch (error) {
      return { data: null, error }
    }
  }
}

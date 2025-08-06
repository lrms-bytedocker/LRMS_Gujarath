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
  current_step?: number,
  integrated712?: string
  integrated712FileName?: string
}

export interface YearSlabData {
  id?: string;
  land_record_id?: string;
  start_year: number;  // Changed to snake_case
  end_year: number;    // Changed to snake_case
  s_no?: string | null;
  s_no_type?: string;
  area_value?: number;
  area_unit?: string;
  integrated_712?: string;
  paiky?: boolean;
  paiky_count?: number;
  ekatrikaran?: boolean;
  ekatrikaran_count?: number;
  paiky_entries?: SlabEntryData[];  // Changed to snake_case
  ekatrikaran_entries?: SlabEntryData[];  // Changed to snake_case
}

export interface SlabEntryData {
  id?: string;
  year_slab_id?: string; // Made optional since it might not exist before saving
  entry_type: 'paiky' | 'ekatrikaran';
  s_no: string;
  s_no_type: string;
  area_value: number;
  area_unit: string;
  integrated_712?: string;
}

export interface Panipatrak {
  slabId: string;
  sNo: string;
  year: number;
  farmers: FarmerStrict[];
}

export interface FarmerStrict {
  id: string;
  name: string;
  area: {
    value: number;
    unit: "acre" | "sq_m";
  };
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
export async function uploadFile(file: File, bucket: string = "land-documents", customPath?: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    
    // Sanitize filename - remove invalid characters
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    
    const fileName = customPath || `${Date.now()}_${sanitizedFileName}`
    const filePath = `private/${fileName}`

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
      // Update existing record (partial save or step completion)
      const updateData = { ...data }
      delete updateData.id // Remove id from update data
      
      const { data: result, error } = await supabase
        .from('land_records')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
          status: data.status || 'draft',           // Default to draft
          current_step: data.current_step || 1     // Default to step 1 if missing
        })
        .eq('id', data.id)
        .select()
        .single()

      return { data: result, error }
    } else {
      // Create new record with step 1 default
      const insertData = { ...data }
      delete insertData.id // Ensure no id field is included for insert
      
      const { data: result, error } = await supabase
        .from('land_records')
        .insert([{
          ...insertData,
          status: 'draft',
          current_step: 1
        }])
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
 static async saveYearSlabs(
  landRecordId: string,
  yearSlabs: YearSlabData[]
): Promise<{ data: any, error: any }> {
  try {
    console.log('Received yearSlabs:', JSON.stringify(yearSlabs, null, 2));

    // Delete existing data
    const { data: existingSlabs, error: fetchError } = await supabase
      .from('year_slabs')
      .select('id')
      .eq('land_record_id', landRecordId);

    if (fetchError) throw fetchError;

    if (existingSlabs?.length) {
      await supabase
        .from('slab_entries')
        .delete()
        .in('year_slab_id', existingSlabs.map(s => s.id));

      await supabase
        .from('year_slabs')
        .delete()
        .eq('land_record_id', landRecordId);
    }

    // Insert new slabs
    const { data: insertedSlabs, error: slabError } = await supabase
      .from('year_slabs')
      .insert(yearSlabs.map(slab => ({
        land_record_id: landRecordId,
        start_year: slab.start_year,
        end_year: slab.end_year,   
        s_no: slab.s_no,
        s_no_type: slab.s_no_type,
        area_value: slab.area_value,
        area_unit: slab.area_unit,
        integrated_712: slab.integrated_712,
        paiky: slab.paiky,
        paiky_count: slab.paiky_count,
        ekatrikaran: slab.ekatrikaran,
        ekatrikaran_count: slab.ekatrikaran_count
      })))
      .select();

    if (slabError) throw slabError;

    // Process entries if they exist
    const entriesToInsert = yearSlabs.flatMap((slab, index) => {
      const slabId = insertedSlabs?.[index]?.id;
      if (!slabId) return [];

      const entries = [];
      
      // Handle paiky entries
      if (slab.paiky_entries?.length) {
        entries.push(...slab.paiky_entries.map(entry => ({
          year_slab_id: slabId,
          entry_type: 'paiky',
          s_no: entry.s_no,
          s_no_type: entry.s_no_type,
          area_value: entry.area_value,
          area_unit: entry.area_unit,
          integrated_712: entry.integrated_712
        })));
      }

      // Handle ekatrikaran entries
      if (slab.ekatrikaran_entries?.length) {
        entries.push(...slab.ekatrikaran_entries.map(entry => ({
          year_slab_id: slabId,
          entry_type: 'ekatrikaran',
          s_no: entry.s_no,
          s_no_type: entry.s_no_type,
          area_value: entry.area_value,
          area_unit: entry.area_unit,
          integrated_712: entry.integrated_712
        })));
      }

      return entries;
    });

    if (entriesToInsert.length > 0) {
      const { error: entryError } = await supabase
        .from('slab_entries')
        .insert(entriesToInsert);
      if (entryError) throw entryError;
    }

    return { data: insertedSlabs, error: null };
  } catch (error) {
    console.error('Detailed save error:', {
      message: error.message,
      stack: error.stack,
      data: error.response?.data
    });
    return { data: null, error };
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
 
  static async getYearSlabs(landRecordId: string): Promise<{ data: YearSlab[] | null, error: any }> {
  try {
    // Get main slab records
    const { data: slabs, error: slabError } = await supabase
      .from('year_slabs')
      .select('*')
      .eq('land_record_id', landRecordId)
      .order('start_year', { ascending: true });

    if (slabError) throw slabError;
    if (!slabs || slabs.length === 0) return { data: null, error: null };

    console.log('Raw slabs from DB:', slabs);

    // Get all entries for these slabs
    const { data: entries, error: entryError } = await supabase
      .from('slab_entries')
      .select('*')
      .in('year_slab_id', slabs.map(s => s.id));

    if (entryError) throw entryError;

    // Transform database records to frontend YearSlab format
    const result: YearSlab[] = slabs.map(slab => {
      const slabEntries = entries?.filter(e => e.year_slab_id === slab.id) || [];
      
      return {
        id: slab.id, // This is the UUID from database
        startYear: slab.start_year,
        endYear: slab.end_year,
        sNo: slab.s_no,
        // Include other fields that might be needed
        area: {
          value: slab.area_value || 0,
          unit: slab.area_unit || 'acre'
        },
        integrated712: slab.integrated_712,
        paiky: slab.paiky || false,
        ekatrikaran: slab.ekatrikaran || false,
        // Transform entries if needed
        paikyEntries: slabEntries.filter(e => e.entry_type === 'paiky'),
        ekatrikaranEntries: slabEntries.filter(e => e.entry_type === 'ekatrikaran')
      };
    });

    console.log('Transformed slabs for frontend:', result);

    return { data: result, error: null };
  } catch (error) {
    console.error('Error fetching year slabs:', error);
    return { data: null, error };
  }
}

static async savePanipatraks(
  landRecordId: string,
  panipatraks: Panipatrak[]
): Promise<{ data: any, error: any }> {
  try {
    // Validate input
    if (!landRecordId || !panipatraks.length) {
      throw new Error('Invalid input: landRecordId and panipatraks are required');
    }

    console.log('Saving panipatraks:', JSON.stringify(panipatraks, null, 2));

    // Validate each panipatrak
    for (const panipatrak of panipatraks) {
      console.log('Validating panipatrak:', panipatrak);
      
      if (!panipatrak.slabId || !panipatrak.sNo || panipatrak.year === undefined) {
        throw new Error(`Invalid panipatrak data: missing required fields. SlabId: ${panipatrak.slabId}, sNo: ${panipatrak.sNo}, year: ${panipatrak.year}`);
      }
      
      // Validate slabId is a proper UUID format or at least not just "1"
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(panipatrak.slabId) && panipatrak.slabId.length < 10) {
        throw new Error(`Invalid slabId format: "${panipatrak.slabId}". Expected UUID format, got: ${typeof panipatrak.slabId}`);
      }
      
      for (const farmer of panipatrak.farmers) {
        if (!farmer.name?.trim()) {
          throw new Error('All farmers must have a name');
        }
        if (farmer.area.value < 0) {
          throw new Error('Area value cannot be negative');
        }
        if (!['acre', 'sq_m'].includes(farmer.area.unit)) {
          throw new Error('Invalid area unit');
        }
      }
    }

    // First delete existing panipatraks and farmers for this land record
    const { data: existingPanipatraks, error: fetchError } = await supabase
      .from('panipatraks')
      .select('id')
      .eq('land_record_id', landRecordId);

    if (fetchError) throw fetchError;

    if (existingPanipatraks?.length) {
      // Delete associated farmers first
      const { error: deleteFarmersError } = await supabase
        .from('panipatrak_farmers')
        .delete()
        .in('panipatrak_id', existingPanipatraks.map(p => p.id));

      if (deleteFarmersError) throw deleteFarmersError;

      // Then delete panipatraks
      const { error: deletePanipatraksError } = await supabase
        .from('panipatraks')
        .delete()
        .eq('land_record_id', landRecordId);

      if (deletePanipatraksError) throw deletePanipatraksError;
    }

    // Insert new panipatraks
    const panipatraksToInsert = panipatraks.map(panipatrak => {
      const insertData = {
        land_record_id: landRecordId,
        year_slab_id: panipatrak.slabId,
        s_no: panipatrak.sNo,
        year: panipatrak.year
      };
      console.log('Inserting panipatrak:', insertData);
      return insertData;
    });

    const { data: insertedPanipatraks, error: insertError } = await supabase
      .from('panipatraks')
      .insert(panipatraksToInsert)
      .select('id');

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    if (!insertedPanipatraks?.length) {
      throw new Error('Failed to insert panipatraks');
    }

    // Now insert the farmers for each panipatrak
    const farmersToInsert = panipatraks.flatMap((panipatrak, index) => {
      const panipatrakId = insertedPanipatraks[index]?.id;
      if (!panipatrakId) return [];

      return panipatrak.farmers.map(farmer => ({
        panipatrak_id: panipatrakId,
        name: farmer.name.trim(),
        area_value: farmer.area.value,
        area_unit: farmer.area.unit
      }));
    });

    if (farmersToInsert.length > 0) {
      const { error: farmerError } = await supabase
        .from('panipatrak_farmers')
        .insert(farmersToInsert);
      
      if (farmerError) throw farmerError;
    }

    return { data: insertedPanipatraks, error: null };
  } catch (error) {
    console.error('Error saving panipatraks:', error);
    return { data: null, error };
  }
}

static async getPanipatraks(landRecordId: string): Promise<{ data: Panipatrak[] | null, error: any }> {
  try {
    if (!landRecordId) {
      throw new Error('landRecordId is required');
    }

    const { data, error } = await supabase
      .from('panipatraks')
      .select(`
        id,
        year_slab_id,
        s_no,
        year,
        farmers:panipatrak_farmers(
          id,
          name,
          area_value,
          area_unit
        )
      `)
      .eq('land_record_id', landRecordId)
      .order('year', { ascending: true });

    if (error) throw error;

    if (!data) return { data: null, error: null };

    const result = data.map(item => ({
      slabId: item.year_slab_id,
      sNo: item.s_no,
      year: item.year,
      farmers: (item.farmers || []).map((f: any) => ({
        id: f.id || `farmer-${Date.now()}-${Math.random()}`,
        name: f.name || '',
        area: {
          value: f.area_value || 0,
          unit: f.area_unit || 'acre'
        }
      }))
    }));

    return { data: result, error: null };
  } catch (error) {
    console.error('Error fetching panipatraks:', error);
    return { data: null, error };
  }
}
}

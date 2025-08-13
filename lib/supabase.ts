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
  areaType: "acre_guntha" | "sq_m";
  acre?: number;
  guntha?: number;
  sq_m?: number;
  paikyNumber?: number;
  ekatrikaranNumber?: number;
  type: 'regular' | 'paiky' | 'ekatrikaran';
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

static async getLandRecordBasicInfo(landRecordId: string): Promise<{ 
  sNo?: string, 
  blockNo?: string, 
  reSurveyNo?: string 
}> {
  const { data, error } = await supabase
    .from('land_records')
    .select('s_no, block_no, re_survey_no')
    .eq('id', landRecordId)
    .single();

  if (error) {
    console.error('Error fetching land record:', error);
    return {};
  }

  return {
    sNo: data.s_no,
    blockNo: data.block_no,
    reSurveyNo: data.re_survey_no
  };
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

  static async updateLandRecord(id: string, updateData: any): Promise<{ data: any, error: any }> {
  const { data, error } = await supabase
    .from('land_records')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
  
  return { data, error }
}

  // Save year slabs
 static async saveYearSlabs(
  landRecordId: string,
  yearSlabs: YearSlabData[]
): Promise<{ data: any, error: any }> {
  try {
    // Delete existing data
    const { data: existingSlabs, error: fetchError } = await supabase
      .from('year_slabs')
      .select('id')
      .eq('land_record_id', landRecordId);
      
    if (fetchError) throw fetchError;
    
    if (existingSlabs?.length) {
      // First delete entries
      const { error: entryDeleteError } = await supabase
        .from('slab_entries')
        .delete()
        .in('year_slab_id', existingSlabs.map(s => s.id));
        
      if (entryDeleteError) throw entryDeleteError;
      
      // Then delete slabs
      const { error: slabDeleteError } = await supabase
        .from('year_slabs')
        .delete()
        .eq('land_record_id', landRecordId);
        
      if (slabDeleteError) throw slabDeleteError;
    }

    // Insert new slabs and get their IDs
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
        paiky: slab.paiky || false,
        paiky_count: slab.paiky_count || 0,
        ekatrikaran: slab.ekatrikaran || false,
        ekatrikaran_count: slab.ekatrikaran_count || 0
      })))
      .select('id');

    if (slabError) throw slabError;
    
    if (!insertedSlabs || insertedSlabs.length !== yearSlabs.length) {
      throw new Error("Failed to insert all year slabs");
    }

    // Prepare all entries for batch insert
    const allEntries = [];
    
    for (let i = 0; i < yearSlabs.length; i++) {
      const slab = yearSlabs[i];
      const slabId = insertedSlabs[i].id;
      
      console.log(`Processing slab ${i}:`, {
        paiky: slab.paiky,
        paiky_entries: slab.paiky_entries?.length || 0,
        ekatrikaran: slab.ekatrikaran,
        ekatrikaran_entries: slab.ekatrikaran_entries?.length || 0
      });
      
      // Add paiky entries - FIXED: Check for entries existence, not just flag
      if (slab.paiky_entries && Array.isArray(slab.paiky_entries) && slab.paiky_entries.length > 0) {
        slab.paiky_entries.forEach((entry, entryIndex) => {
          // Only add entries that have some data
          if (entry.s_no || entry.area_value > 0) {
            allEntries.push({
              year_slab_id: slabId,
              entry_type: 'paiky',
              s_no: entry.s_no || '',
              s_no_type: entry.s_no_type || 's_no',
              area_value: entry.area_value || 0,
              area_unit: entry.area_unit || 'sq_m',
              integrated_712: entry.integrated_712 || null
            });
          }
        });
      }
      
      // Add ekatrikaran entries - FIXED: Check for entries existence, not just flag
      if (slab.ekatrikaran_entries && Array.isArray(slab.ekatrikaran_entries) && slab.ekatrikaran_entries.length > 0) {
        slab.ekatrikaran_entries.forEach((entry, entryIndex) => {
          // Only add entries that have some data
          if (entry.s_no || entry.area_value > 0) {
            allEntries.push({
              year_slab_id: slabId,
              entry_type: 'ekatrikaran',
              s_no: entry.s_no || '',
              s_no_type: entry.s_no_type || 's_no',
              area_value: entry.area_value || 0,
              area_unit: entry.area_unit || 'sq_m',
              integrated_712: entry.integrated_712 || null
            });
          }
        });
      }
    }

    console.log(`Total entries to insert: ${allEntries.length}`);
    
    // Insert all entries in a single batch if there are any
    if (allEntries.length > 0) {
      const { error: entryError } = await supabase
        .from('slab_entries')
        .insert(allEntries);
        
      if (entryError) {
        console.error('Entry insert error:', entryError);
        throw entryError;
      }
    }

    return {
      data: {
        slabs: insertedSlabs,
        entriesCount: allEntries.length
      },
      error: null
    };
  } catch (error) {
    console.error('Detailed save error:', error);
    return { data: null, error };
  }
}

static async updateYearSlabs(
  landRecordId: string,
  yearSlabs: YearSlabData[]
): Promise<{ data: any, error: any }> {
  try {
    // 1. Update main slab records
    const { error: slabError } = await supabase
      .from('year_slabs')
      .upsert(yearSlabs.map(slab => ({
        id: slab.id,
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
      })));

    if (slabError) throw slabError;

    // 2. Process all slabs and their entries
    for (const slab of yearSlabs) {
      // Get existing entries for this slab from database
      const { data: existingEntries, error: fetchError } = await supabase
        .from('slab_entries')
        .select('*')
        .eq('year_slab_id', slab.id);

      if (fetchError) throw fetchError;

      // Process PAIKY entries
      if (slab.paiky) {
        await this.processEntries(
          slab.id,
          'paiky',
          existingEntries?.filter(e => e.entry_type === 'paiky') || [],
          slab.paiky_entries || []
        );
      }

      // Process EKATRIKARAN entries
      if (slab.ekatrikaran) {
        await this.processEntries(
          slab.id,
          'ekatrikaran',
          existingEntries?.filter(e => e.entry_type === 'ekatrikaran') || [],
          slab.ekatrikaran_entries || []
        );
      }
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error updating year slabs:', error);
    return { data: null, error };
  }
}

private static async processEntries(
  slabId: string,
  entryType: 'paiky' | 'ekatrikaran',
  existingEntries: any[],
  currentEntries: any[]
) {
  // 1. Identify entries to delete (exist in DB but not in current entries)
  const currentEntryIds = currentEntries.map(e => e.id).filter(Boolean);
  const entriesToDelete = existingEntries
    .filter(dbEntry => !currentEntryIds.includes(dbEntry.id))
    .map(e => e.id);

  // 2. Delete removed entries
  if (entriesToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('slab_entries')
      .delete()
      .in('id', entriesToDelete);
    if (deleteError) throw deleteError;
  }

  // 3. Upsert current entries (only those with IDs - new entries without IDs will be handled separately)
  const entriesToUpsert = currentEntries.filter(entry => entry.id);
  if (entriesToUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from('slab_entries')
      .upsert(entriesToUpsert.map(entry => ({
        id: entry.id,
        year_slab_id: slabId,
        entry_type: entryType,
        s_no: entry.s_no,
        s_no_type: entry.s_no_type,
        area_value: entry.area_value,
        area_unit: entry.area_unit,
        integrated_712: entry.integrated_712
      })));
    if (upsertError) throw upsertError;
  }

  // 4. Insert new entries (those without IDs)
  const newEntries = currentEntries.filter(entry => !entry.id);
  if (newEntries.length > 0) {
    const { error: insertError } = await supabase
      .from('slab_entries')
      .insert(newEntries.map(entry => ({
        year_slab_id: slabId,
        entry_type: entryType,
        s_no: entry.s_no,
        s_no_type: entry.s_no_type,
        area_value: entry.area_value,
        area_unit: entry.area_unit,
        integrated_712: entry.integrated_712
      })));
    if (insertError) throw insertError;
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
        nondh_doc_url: nondh.nondhDoc,
        nondh_doc_filename: nondh.nondhDocFileName || null // Add this line
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
 
  // Update getYearSlabs to properly transform entries
static async getYearSlabs(landRecordId: string): Promise<{ data: YearSlabData[] | null, error: any }> {
  try {
    const { data: slabs, error: slabError } = await supabase
      .from('year_slabs')
      .select('*')
      .eq('land_record_id', landRecordId)
      .order('start_year', { ascending: false }); // Changed to descending order

    if (slabError) throw slabError;
    if (!slabs || slabs.length === 0) return { data: null, error: null };

    const { data: entries, error: entryError } = await supabase
      .from('slab_entries')
      .select('*')
      .in('year_slab_id', slabs.map(s => s.id));

    if (entryError) throw entryError;

    return { 
      data: slabs.map(slab => ({
        id: slab.id,
        startYear: slab.start_year,
        endYear: slab.end_year,
        sNo: slab.s_no,
        sNoType: slab.s_no_type,
        area: {
          value: slab.area_value,
          unit: slab.area_unit
        },
        integrated712: slab.integrated_712,
        paiky: slab.paiky,
        paikyCount: slab.paiky_count,
        ekatrikaran: slab.ekatrikaran,
        ekatrikaranCount: slab.ekatrikaran_count,
        paikyEntries: entries
          ?.filter(e => e.year_slab_id === slab.id && e.entry_type === 'paiky')
          .map(e => ({
            sNo: e.s_no,
            sNoType: e.s_no_type,
            area: {
              value: e.area_value,
              unit: e.area_unit
            },
            integrated712: e.integrated_712
          })) || [],
        ekatrikaranEntries: entries
          ?.filter(e => e.year_slab_id === slab.id && e.entry_type === 'ekatrikaran')
          .map(e => ({
            sNo: e.s_no,
            sNoType: e.s_no_type,
            area: {
              value: e.area_value,
              unit: e.area_unit
            },
            integrated712: e.integrated_712
          })) || []
      })),
      error: null
    };
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
    if (!landRecordId || !panipatraks?.length) {
      throw new Error('Invalid input: landRecordId and panipatraks are required');
    }

    console.log('Saving panipatraks:', JSON.stringify(panipatraks, null, 2));

    // Validate each panipatrak
    for (const panipatrak of panipatraks) {
      if (!panipatrak.slabId || !panipatrak.sNo || panipatrak.year === undefined) {
        throw new Error(`Invalid panipatrak data: missing required fields. SlabId: ${panipatrak.slabId}, sNo: ${panipatrak.sNo}, year: ${panipatrak.year}`);
      }
      
      // Validate slabId is a proper UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(panipatrak.slabId)) {
        throw new Error(`Invalid slabId format: "${panipatrak.slabId}". Expected UUID format`);
      }
      
      if (!panipatrak.farmers || panipatrak.farmers.length === 0) {
        throw new Error('Each panipatrak must have at least one farmer');
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
    const panipatraksToInsert = panipatraks.map(panipatrak => ({
      land_record_id: landRecordId,
      year_slab_id: panipatrak.slabId,
      s_no: panipatrak.sNo,
      year: panipatrak.year
    }));

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
  area_unit: farmer.area.unit,
  paiky_number: farmer.paikyNumber || null,
  ekatrikaran_number: farmer.ekatrikaranNumber || null,
  farmer_type: farmer.type
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

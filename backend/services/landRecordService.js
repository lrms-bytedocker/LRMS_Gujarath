import { supabase } from '../lib/supabase.js';
import { validateNondhDetail } from '../validators/landRecordValidator.js';

const NONDH_TYPES = [
  "Kabjedaar", "Ekatrikaran", "Varsai", "Hayati_ma_hakh_dakhal",
  "Hakkami", "Vechand", "Durasti", "Promulgation", "Hukam",
  "Vehchani", "Bojo", "Other"
];

const TENURE_TYPES = [
  "Navi", "Juni", "Kheti_Kheti_ma_Juni", "NA",
  "Bin_Kheti_Pre_Patra", "Prati_bandhit_satta_prakar"
];

// Area conversion utilities
const convertToSquareMeters = (value, unit) => {
  switch (unit) {
    case "acre": return value * 4046.86;
    case "guntha": return value * 101.17;
    case "sq_m": return value;
    default: return value;
  }
};

const parseArea = (areaObj) => {
  if (!areaObj) return { value: 0, unit: 'sq_m' };

  if (areaObj.sqm !== undefined) {
    return { value: areaObj.sqm, unit: 'sq_m' };
  }

  if (areaObj.acre !== undefined || areaObj.guntha !== undefined) {
    const acres = areaObj.acre || 0;
    const gunthas = areaObj.guntha || 0;
    
    const acreInSqm = convertToSquareMeters(acres, 'acre');
    const gunthaInSqm = convertToSquareMeters(gunthas, 'guntha');
    const totalSqm = acreInSqm + gunthaInSqm;

    return { value: totalSqm, unit: 'sq_m' };
  }

  return { value: 0, unit: 'sq_m' };
};

const parseDate = (dateStr) => {
  if (dateStr && dateStr.length === 8) {
    const day = dateStr.substring(0, 2);
    const month = dateStr.substring(2, 4);
    const year = dateStr.substring(4, 8);
    return `${year}-${month}-${day}`;
  }
  return null;
};

const mapStatusFromJSON = (jsonStatus) => {
  switch (jsonStatus) {
    case "Pramaanik": return "valid";
    case "Radd": return "invalid";
    case "Na Manjoor": return "nullified";
    default: return "valid";
  }
};

const getPrimarySNoType = (affectedSNos) => {
  if (!affectedSNos || affectedSNos.length === 0) return 's_no';
  
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  
  const types = affectedSNos.map(sNo => {
    try {
      if (typeof sNo === 'string') {
        const parsed = JSON.parse(sNo);
        return parsed.type || 's_no';
      } else if (typeof sNo === 'object' && sNo.type) {
        return sNo.type;
      }
      return 's_no';
    } catch (e) {
      return 's_no';
    }
  });
  
  for (const type of priorityOrder) {
    if (types.includes(type)) return type;
  }
  
  return 's_no';
};

const sortNondhs = (nondhs) => {
  return [...nondhs].sort((a, b) => {
    const aType = getPrimarySNoType(a.affected_s_nos);
    const bType = getPrimarySNoType(b.affected_s_nos);

    const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
    const aPriority = priorityOrder.indexOf(aType);
    const bPriority = priorityOrder.indexOf(bType);

    if (aPriority !== bPriority) return aPriority - bPriority;

    const aNum = parseInt(a.number.toString()) || 0;
    const bNum = parseInt(b.number.toString()) || 0;
    return aNum - bNum;
  });
};

const processValidityChain = (validDetails, sortedNondhs) => {
  const nondhDetailMap = new Map();
  validDetails.forEach(detail => {
    nondhDetailMap.set(detail.nondhNumber, detail);
  });

  const affectingCounts = new Map();
  
  sortedNondhs.forEach((nondh, index) => {
    let count = 0;
    
    for (let i = index + 1; i < sortedNondhs.length; i++) {
      const affectingNondh = sortedNondhs[i];
      const affectingDetail = nondhDetailMap.get(affectingNondh.number);
      if (affectingDetail?.mappedStatus === 'invalid') {
        count++;
      }
    }
    
    affectingCounts.set(nondh.number, count);
  });

  validDetails.forEach(detail => {
    const affectingCount = affectingCounts.get(detail.nondhNumber) || 0;
    const shouldBeValid = affectingCount % 2 === 0;
    detail.isValid = shouldBeValid;
  });

  return validDetails;
};

// Main processing function
export const processUpload = async (jsonData) => {
  const errors = [];
  let landRecordId = null;

  try {
    // Step 1: Save land record basic info
    const basicInfoArea = parseArea(jsonData.basicInfo.area);
    
    const landRecordData = {
      district: jsonData.basicInfo.district,
      taluka: jsonData.basicInfo.taluka,
      village: jsonData.basicInfo.village,
      block_no: jsonData.basicInfo.blockNo || null,
      re_survey_no: jsonData.basicInfo.reSurveyNo || null,
      is_promulgation: jsonData.basicInfo.isPromulgation || false,
      s_no_type: jsonData.basicInfo.blockNo ? 'block_no' : 're_survey_no',
      s_no: jsonData.basicInfo.blockNo || jsonData.basicInfo.reSurveyNo,
      area_value: basicInfoArea.value,
      area_unit: basicInfoArea.unit,
      json_uploaded: true,
      status: 'draft',
      current_step: 1
    };

    const { data: savedRecord, error: recordError } = await supabase
      .from('land_records')
      .insert([landRecordData])
      .select()
      .single();
    
    if (recordError) {
      throw new Error(`Failed to save land record: ${recordError.message}`);
    }

    landRecordId = savedRecord.id;

    // Step 2: Save nondhs
    let savedNondhs = [];
    if (jsonData.nondhs && jsonData.nondhs.length > 0) {
      const nondhsData = jsonData.nondhs.map(nondh => ({
        id: crypto.randomUUID(),
        land_record_id: landRecordId,
        number: String(nondh.number),
        s_no_type: nondh.sNoType || nondh.s_no_type || 's_no',
        affected_s_nos: nondh.affectedSNos
      }));

      const { data: nondhsResult, error: nondhError } = await supabase
        .from('nondhs')
        .insert(nondhsData)
        .select();
      
      if (nondhError) {
        throw new Error(`Failed to save nondhs: ${nondhError.message}`);
      }
      savedNondhs = nondhsResult || [];
    }

    const sortedNondhs = sortNondhs(savedNondhs);
    
    let validNondhDetails = [];
    let skippedNondhDetails = [];
    let totalOwnersInserted = 0;
    let savedNondhDetailsWithIds = [];

    // Step 3: Process and save nondh details (with individual validation)
    if (jsonData.nondhDetails && jsonData.nondhDetails.length > 0) {
      for (const detail of jsonData.nondhDetails) {
        const detailValidationErrors = validateNondhDetail(detail, validNondhDetails.length);
        
        if (detailValidationErrors.length > 0) {
          skippedNondhDetails.push(
            `Nondh ${detail.nondhNumber || 'unknown'}: ${detailValidationErrors.join(', ')}`
          );
          continue;
        }

        const correspondingNondh = savedNondhs.find(
          n => n.number.toString() === detail.nondhNumber.toString()
        );

        if (!correspondingNondh) {
          skippedNondhDetails.push(
            `Nondh ${detail.nondhNumber}: No matching nondh found in nondhs array`
          );
          continue;
        }

        const mappedStatus = detail.status ? mapStatusFromJSON(detail.status) : "valid";

        const nondhDetailData = {
          nondh_id: correspondingNondh.id,
          type: detail.type,
          date: parseDate(detail.date),
          sd_date: detail.sdDate ? parseDate(detail.sdDate) : null,
          hukam_date: detail.hukamDate ? parseDate(detail.hukamDate) : null,
          hukam_type: detail.type === "Hukam" ? (detail.hukamType || "SSRD") : null,
          restraining_order: detail.restrainingOrder || null,
          amount: detail.amount || null,
          vigat: detail.vigat,
          tenure: detail.tenure || 'Navi',
          status: mappedStatus,
          invalid_reason: mappedStatus === "invalid" ? (detail.invalidReason || "NA") : null,
          show_in_output: detail.showInOutput !== false,
          old_owner: detail.oldOwner || null,
          affected_nondh_details: detail.affectedNondhDetails && detail.affectedNondhDetails.length > 0
            ? JSON.stringify(detail.affectedNondhDetails.map(a => ({
                nondhNo: a.nondhNo,
                status: mapStatusFromJSON(a.status),
                invalidReason: mapStatusFromJSON(a.status) === "invalid" ? (a.invalidReason || "NA") : null
              })))
            : null,
          ganot: detail.hukamType === "ALT Krushipanch" ? detail.ganotType : null,
        };

        const { data: nondhDetailResult, error: nondhDetailsError } = await supabase
          .from('nondh_details')
          .insert([nondhDetailData])
          .select()
          .single();
        
        if (nondhDetailsError) {
          skippedNondhDetails.push(`Nondh ${detail.nondhNumber || 'unknown'}: Database error - ${nondhDetailsError.message}`);
          continue;
        }

        if (nondhDetailResult) {
          savedNondhDetailsWithIds.push({
            ...nondhDetailResult,
            originalDetail: detail,
            nondhNumber: detail.nondhNumber,
            mappedStatus: mappedStatus,
            isValid: true
          });
          
          validNondhDetails.push(nondhDetailResult);
        }
      }

      // Apply validity chain to saved details
      const detailsWithValidityChain = processValidityChain(
        savedNondhDetailsWithIds,
        sortedNondhs
      );

      // Step 4: Save owner relations with validity chain applied
      for (const nondhDetail of detailsWithValidityChain) {
        const originalDetail = nondhDetail.originalDetail;
        if (!originalDetail) continue;

        // Process regular owners
        if (originalDetail.owners && originalDetail.owners.length > 0) {
          for (const owner of originalDetail.owners) {
            const area = parseArea(owner.area);
            const { error } = await supabase
              .from('nondh_owner_relations')
              .insert([{
                nondh_detail_id: nondhDetail.id,
                owner_name: owner.name,
                square_meters: area.value,
                area_unit: area.unit,
                survey_number: owner.surveyNumber || null,
                survey_number_type: owner.surveyNumberType || null,
                is_valid: nondhDetail.isValid
              }]);
            
            if (!error) totalOwnersInserted++;
          }
        }

        // Process new owners for transfer types
        if (originalDetail.newOwners && originalDetail.newOwners.length > 0) {
          for (const newOwner of originalDetail.newOwners) {
            const area = parseArea(newOwner.area);
            const { error } = await supabase
              .from('nondh_owner_relations')
              .insert([{
                nondh_detail_id: nondhDetail.id,
                owner_name: newOwner.name,
                square_meters: area.value,
                area_unit: area.unit,
                survey_number: newOwner.surveyNumber || null,
                survey_number_type: newOwner.surveyNumberType || null,
                is_valid: nondhDetail.isValid
              }]);
            
            if (!error) totalOwnersInserted++;
          }
        }
      }
    }

    const stats = {
      yearSlabs: 0,
      panipatraks: 0,
      farmers: 0,
      nondhs: savedNondhs.length,
      nondhDetails: validNondhDetails.length,
      totalOwners: totalOwnersInserted,
      skippedNondhDetails: skippedNondhDetails.length
    };

    return {
      success: true,
      message: 'Land record uploaded and processed successfully',
      stats,
      landRecordId,
      errors: skippedNondhDetails.length > 0 ? skippedNondhDetails : undefined
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      message: 'Upload failed',
      error: error.message,
      landRecordId
    };
  }
};
"use client"
import React, { useState } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, FileJson, Loader2 } from 'lucide-react';
import { LandRecordService } from '@/lib/supabase';

// Area conversion utilities
const convertToSquareMeters = (value, unit) => {
  switch (unit) {
    case "acre":
      return value * 4046.86;
    case "guntha":
      return value * 101.17;
    case "sq_m":
      return value;
    default:
      return value;
  }
};

const LandRecordJSONUpload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState([]);

  const sampleJSON = {
    basicInfo: {
      district: "Mysuru",
      taluka: "Mysuru",
      village: "Yelawala",
      blockNo: "123",
    reSurveyNo: "245/2",
      isPromulgation: true,
    },
    yearSlabs: [
      {
        startYear: 2010,
        endYear: 2015,
        sNo: "123",
        sNoType: "block_no",
        area: {
          sqm: 22257.3
        }
      },
      {
        startYear: 2016,
        endYear: 2020,
        paiky: true,
        paikyEntries: [
          {
            sNo: "124/1",
            sNoType: "s_no",
            area: {
              sqm: 5058.5
            }
          }
        ]
      }
    ],
    panipatraks: [
  {
    year: 2012,
    farmers: [
      {
        name: "Farmer Name 1",
        area: {
          acre: 3,
          guntha: 0
        }
        // No paikyNumber or ekatrikaranNumber for regular farmers
      },
      {
        name: "Farmer Name 2",
        area: {
          sqm: 10117
        }
        // No paikyNumber or ekatrikaranNumber for regular farmers
      }
    ]
  },
  {
    year: 2018,
    farmers: [
      {
        name: "Main Land Owner",
        area: {
          sqm: 8000
        }
        // Regular owner - no numbers
      },
      {
        name: "Paiky Owner 1",
        area: {
          sqm: 5058.5
        },
        paikyNumber: 1
        // Only paikyNumber, no ekatrikaranNumber
      },
      {
        name: "Ekatrikaran Owner 1",
        area: {
          sqm: 3000
        },
        ekatrikaranNumber: 1
        // Only ekatrikaranNumber, no paikyNumber
      }
    ]
  }
],
    nondhs: [
      {
        number: "1",
        affectedSNos: [
          { number: "123", type: "block_no" },
          { number: "124/1", type: "s_no" }
        ]
      },
      {
        number: "2",
        affectedSNos: [
          { number: "234/2", type: "re_survey_no" }
        ]
      }
    ],
    nondhDetails: [
      {
        nondhNumber: "1",
        type: "Kabjedaar",
        date: "15012015",
        vigat: "Initial possession entry",
        tenure: "Navi",
        status: "valid",
        showInOutput: true,
        owners: [
          {
            name: "Owner 1",
            area: {
              acre: 3,
              guntha: 0
            }
          },
          {
            name: "Owner 2",
            area: {
              sqm: 10117
            }
          }
        ]
      },
      {
        nondhNumber: "2",
        type: "Varsai",
        date: "20052018",
        vigat: "Transfer from Owner 1 to new owners",
        tenure: "Navi",
        status: "valid",
        oldOwner: "Owner 1",
        showInOutput: true,
        newOwners: [
          {
            name: "New Owner 1",
            area: {
              acre: 1,
              guntha: 20
            }
          },
          {
            name: "New Owner 2",
            area: {
              acre: 1,
              guntha: 20
            }
          }
        ]
      },
      {
        nondhNumber: "3",
        type: "Hukam",
        date: "10032019",
        hukamDate: "05032019",
        hukamType: "SSRD",
        restrainingOrder: "no",
        vigat: "Court order regarding land dispute",
        tenure: "Navi",
        status: "valid",
        showInOutput: true,
         affectedNondhDetails: [
          {
            nondhNo: "1",
            status: "invalid",
            invalidReason: "Superseded by court order"
          }
        ],
        owners: [
          {
            name: "Court Appointed Owner",
            area: {
              sqm: 20234
            }
          }
        ]
      },
      {
        nondhNumber: "4",
        type: "Vechand",
        date: "15062020",
        sdDate: "10062020",
        amount: 500000,
        vigat: "Sale transaction",
        tenure: "Navi",
        status: "valid",
        oldOwner: "Owner 2",
        showInOutput: true,
        newOwners: [
          {
            name: "Buyer Name",
            area: {
              acre: 2,
              guntha: 20
            }
          }
        ]
      },
      {
        nondhNumber: "5",
        type: "Hakkami",
        date: "20082021",
        vigat: "Possession transfer",
        tenure: "Navi",
        status: "valid",
        oldOwner: "New Owner 1",
        showInOutput: true,
        newOwners: [
          {
            name: "Hakkami Recipient 1",
            area: {
              sqm: 4046.86
            }
          },
          {
            name: "Hakkami Recipient 2",
            area: {
              sqm: 4046.86
            }
          }
        ]
      },
      {
        nondhNumber: "6",
        type: "Durasti",
        date: "10012022",
        vigat: "Correction entry",
        tenure: "Navi",
        status: "valid",
        showInOutput: true,
        owners: [
          {
            name: "Corrected Owner Name",
            surveyNumber: "126",
            surveyNumberType: "block_no",
            area: {
              acre: 4,
              guntha: 0
            }
          }
        ]
      },
      {
        nondhNumber: "7",
        type: "Bojo",
        date: "25052022",
        vigat: "Load entry",
        tenure: "Navi",
        status: "invalid",
        invalidReason: "Entry canceled due to documentation error",
        showInOutput: false,
        owners: [
          {
            name: "Bojo Owner",
            area: {
              sqm: 5058.5
            }
          }
        ]
      }
    ]
  };

  const downloadSampleJSON = () => {
    const dataStr = JSON.stringify(sampleJSON, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'land_record_sample.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const parseArea = (areaObj) => {
    if (!areaObj) return { value: 0, unit: 'sq_m' };

    if (areaObj.sqm !== undefined) {
      return {
        value: areaObj.sqm,
        unit: 'sq_m'
      };
    }

    if (areaObj.acre !== undefined || areaObj.guntha !== undefined) {
      const acres = areaObj.acre || 0;
      const gunthas = areaObj.guntha || 0;
      
      const acreInSqm = convertToSquareMeters(acres, 'acre');
      const gunthaInSqm = convertToSquareMeters(gunthas, 'guntha');
      const totalSqm = acreInSqm + gunthaInSqm;

      return {
        value: totalSqm,
        unit: 'sq_m'
      };
    }

    return { value: 0, unit: 'sq_m' };
  };

  const findSlabForYear = (year, yearSlabs) => {
    return yearSlabs.find(slab => 
      year >= slab.startYear && year < slab.endYear
    );
  };

  const validateJSON = (data) => {
    const validationErrors = [];

    if (!data.basicInfo) {
      validationErrors.push("Missing 'basicInfo' section");
    } else {
      const required = ['district', 'taluka', 'village'];
      required.forEach(field => {
        if (!data.basicInfo[field]) {
          validationErrors.push(`Missing required field in basicInfo: ${field}`);
        }
      });

      if (!data.basicInfo.blockNo && !data.basicInfo.reSurveyNo) {
        validationErrors.push("Basic info must have either 'blockNo' or 'reSurveyNo'");
      }
    }

    if (!data.yearSlabs || !Array.isArray(data.yearSlabs) || data.yearSlabs.length === 0) {
      validationErrors.push("At least one year slab is required");
    }

    if (data.panipatraks) {
    data.panipatraks.forEach((panip, i) => {
      if (!panip.year) {
        validationErrors.push(`Panipatrak ${i + 1}: Missing year`);
      } else {
        const matchingSlab = findSlabForYear(panip.year, data.yearSlabs);
        if (!matchingSlab) {
          validationErrors.push(
            `Panipatrak ${i + 1}: Year ${panip.year} does not fall within any year slab range`
          );
        }
      }
      
      if (!panip.farmers || panip.farmers.length === 0) {
        validationErrors.push(`Panipatrak ${i + 1}: Must have at least one farmer`);
      }
      
      panip.farmers?.forEach((farmer, j) => {
        if (!farmer.name) {
          validationErrors.push(`Panipatrak ${i + 1}, Farmer ${j + 1}: Missing name`);
        }
        
        // Remove mandatory validation for paikyNumber and ekatrikaranNumber
        // Add validation for mutual exclusivity
        if (farmer.paikyNumber !== undefined && farmer.ekatrikaranNumber !== undefined) {
          validationErrors.push(`Panipatrak ${i + 1}, Farmer ${j + 1}: Cannot have both paikyNumber and ekatrikaranNumber`);
        }
        
        // Validate that if numbers are provided, they are positive
        if (farmer.paikyNumber !== undefined && farmer.paikyNumber < 0) {
          validationErrors.push(`Panipatrak ${i + 1}, Farmer ${j + 1}: paikyNumber must be 0 or positive`);
        }
        if (farmer.ekatrikaranNumber !== undefined && farmer.ekatrikaranNumber < 0) {
          validationErrors.push(`Panipatrak ${i + 1}, Farmer ${j + 1}: ekatrikaranNumber must be 0 or positive`);
        }
      });
    });
  }

    // Enhanced validation for nondh details from 2nd version
    if (data.nondhDetails) {
      data.nondhDetails.forEach((detail, i) => {
        if (!detail.nondhNumber) {
          validationErrors.push(`Nondh detail ${i + 1}: Missing nondh number`);
        }
        if (!detail.type) {
          validationErrors.push(`Nondh detail ${i + 1}: Missing type`);
        }
        if (!detail.date) {
          validationErrors.push(`Nondh detail ${i + 1}: Missing date`);
        } else if (detail.date.length !== 8) {
          validationErrors.push(`Nondh detail ${i + 1}: Date must be in ddmmyyyy format (e.g., 15012020)`);
        }
        if (!detail.vigat) {
          validationErrors.push(`Nondh detail ${i + 1}: Missing vigat`);
        }

        // Type-specific validations
        // const transferTypes = ["Varsai", "Hakkami", "Vechand", "Hayati_ma_hakh_dakhal", "Vehchani"];
        // if (transferTypes.includes(detail.type)) {
        //   if (!detail.oldOwner) {
        //     validationErrors.push(`Nondh detail ${i + 1}: Transfer type '${detail.type}' requires oldOwner`);
        //   }
        //   if (!detail.newOwners || detail.newOwners.length === 0) {
        //     validationErrors.push(`Nondh detail ${i + 1}: Transfer type '${detail.type}' requires at least one new owner`);
        //   }
        // } else if (!["Hukam"].includes(detail.type)) {
        //   if (!detail.owners || detail.owners.length === 0) {
        //     validationErrors.push(`Nondh detail ${i + 1}: Requires at least one owner`);
        //   }
        // }

        // // Vechand specific
        // if (detail.type === "Vechand") {
        //   if (!detail.sdDate) {
        //     validationErrors.push(`Nondh detail ${i + 1}: Vechand type requires sdDate`);
        //   }
        //   if (!detail.amount) {
        //     validationErrors.push(`Nondh detail ${i + 1}: Vechand type requires amount`);
        //   }
        // }

        // // Hukam specific
        // if (detail.type === "Hukam") {
        //   if (!detail.hukamType) {
        //     validationErrors.push(`Nondh detail ${i + 1}: Hukam type requires hukamType`);
        //   }
        //   if (!detail.restrainingOrder) {
        //     validationErrors.push(`Nondh detail ${i + 1}: Hukam type requires restrainingOrder (yes/no)`);
        //   }
        // }

        // Status validation
        if (detail.status === "invalid" && !detail.invalidReason) {
          validationErrors.push(`Nondh detail ${i + 1}: Invalid status requires invalidReason`);
        }
      });
    }

    return validationErrors;
  };

  const processUpload = async (jsonData) => {
    try {
      setLoading(true);
      setErrors([]);
      
      const validationErrors = validateJSON(jsonData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setResult({ success: false, message: 'Validation failed' });
        return;
      }

      // Step 1: Save land record basic info
      const landRecordData = {
        district: jsonData.basicInfo.district,
        taluka: jsonData.basicInfo.taluka,
        village: jsonData.basicInfo.village,
        block_no: jsonData.basicInfo.blockNo || null,
        re_survey_no: jsonData.basicInfo.reSurveyNo || null,
        is_promulgation: jsonData.basicInfo.isPromulgation || false,
        s_no_type: jsonData.basicInfo.blockNo ? 'block_no' : 're_survey_no',
        s_no: jsonData.basicInfo.blockNo || jsonData.basicInfo.reSurveyNo,
        area_value: 0,
        area_unit: 'sq_m',
        status: 'draft',
        current_step: 1
      };

      const { data: savedRecord, error: recordError } = await LandRecordService.saveLandRecord(landRecordData);
      
      if (recordError) {
        throw new Error(`Failed to save land record: ${recordError.message}`);
      }

      const landRecordId = savedRecord.id;

      // Step 2: Save year slabs
      // const yearSlabsData = jsonData.yearSlabs.map(slab => {
      //   const area = parseArea(slab.area);
      //   return {
      //     land_record_id: landRecordId,
      //     start_year: slab.startYear,
      //     end_year: slab.endYear,
      //     s_no: slab.sNo,
      //     s_no_type: slab.sNoType,
      //     area_value: area.value,
      //     area_unit: area.unit,
      //     paiky: slab.paiky || false,
      //     paiky_count: slab.paikyEntries?.length || 0,
      //     ekatrikaran: slab.ekatrikaran || false,
      //     ekatrikaran_count: slab.ekatrikaranEntries?.length || 0,
      //     paiky_entries: slab.paikyEntries?.map(entry => ({
      //       s_no: entry.sNo,
      //       s_no_type: entry.sNoType,
      //       area_value: parseArea(entry.area).value,
      //       area_unit: parseArea(entry.area).unit,
      //       entry_type: 'paiky'
      //     })) || [],
      //     ekatrikaran_entries: slab.ekatrikaranEntries?.map(entry => ({
      //       s_no: entry.sNo,
      //       s_no_type: entry.sNoType,
      //       area_value: parseArea(entry.area).value,
      //       area_unit: parseArea(entry.area).unit,
      //       entry_type: 'ekatrikaran'
      //     })) || []
      //   };
      // });

      // const { data: savedSlabs, error: slabsError } = await LandRecordService.saveYearSlabs(
      //   landRecordId, 
      //   yearSlabsData
      // );
      
      // if (slabsError) {
      //   throw new Error(`Failed to save year slabs: ${slabsError.message}`);
      // }

      // Step 3: Save panipatraks with year-based matching and foreign key
// if (jsonData.panipatraks && jsonData.panipatraks.length > 0) {
//   const panipatraksData = jsonData.panipatraks.map(panip => {
//     // Find matching slab based on year
//     const matchingSlabData = jsonData.yearSlabs.find(slab => 
//       panip.year >= slab.startYear && panip.year < slab.endYear
//     );
    
//     // Find the corresponding saved slab by matching start and end years
//     const savedSlab = (savedSlabs.slabs || savedSlabs).find(s => 
//   s.start_year === matchingSlabData.startYear && 
//   s.end_year === matchingSlabData.endYear
// );
//     if (!savedSlab) {
//   throw new Error(`Could not find matching year slab for panipatrak year ${panip.year}`);
// }
//     return {
//       yearslab_id: savedSlab.id, // Foreign key to year_slabs table
//       land_record_id: landRecordId,
//       s_no: matchingSlabData.sNo,
//       year: panip.year,
//       farmers: panip.farmers.map(farmer => {
//         const area = parseArea(farmer.area);
        
//         // AUTO-DETECT farmer type based on numbers (not mandatory)
//         let farmerType = 'regular';
//         let paikyNumber = null;
//         let ekatrikaranNumber = null;
        
//         if (farmer.paikyNumber !== undefined && farmer.paikyNumber > 0) {
//           farmerType = 'paiky';
//           paikyNumber = farmer.paikyNumber;
//         } else if (farmer.ekatrikaranNumber !== undefined && farmer.ekatrikaranNumber > 0) {
//           farmerType = 'ekatrikaran';
//           ekatrikaranNumber = farmer.ekatrikaranNumber;
//         }
        
//         return {
//           name: farmer.name,
//           area_value: area.value,
//           area_unit: area.unit,
//           type: farmerType,
//           paiky_number: paikyNumber,
//           ekatrikaran_number: ekatrikaranNumber
//         };
//       })
//     };
//   });

//   const { error: panipError } = await LandRecordService.savePanipatraks(panipatraksData);
  
//   if (panipError) {
//     throw new Error(`Failed to save panipatraks: ${panipError.message}`);
//   }
// }

      // Step 4: Save nondhs
      let savedNondhs = [];
      if (jsonData.nondhs && jsonData.nondhs.length > 0) {
        const nondhsData = jsonData.nondhs.map(nondh => ({
          id: crypto.randomUUID(), // Temporary ID for mapping
          land_record_id: landRecordId,
          number: nondh.number,
          affected_s_nos: nondh.affectedSNos
        }));

        const { data: nondhsResult, error: nondhError } = await LandRecordService.upsertNondhs(nondhsData);
        
        if (nondhError) {
          throw new Error(`Failed to save nondhs: ${nondhError.message}`);
        }
        savedNondhs = nondhsResult || [];
      }

      // Step 5: Save nondh details with foreign keys
  let savedNondhDetails = [];
if (jsonData.nondhDetails && jsonData.nondhDetails.length > 0) {
  for (const detail of jsonData.nondhDetails) {
    // Find the corresponding nondh
    const correspondingNondh = savedNondhs.find(n => n.number === detail.nondhNumber);
    
    const nondhDetailData = {
      nondh_id: correspondingNondh?.id || null, // Foreign key to nondhs table
      type: detail.type,
      date: parseDate(detail.date),
      sd_date: detail.sdDate ? parseDate(detail.sdDate) : null,
      hukam_date: detail.hukamDate ? parseDate(detail.hukamDate) : null,
      hukam_type: detail.hukamType || null,
      restraining_order: detail.restrainingOrder || null,
      amount: detail.amount || null,
      vigat: detail.vigat,
      tenure: detail.tenure || 'Navi',
      status: detail.status || 'valid',
      invalid_reason: detail.invalidReason || null,
      show_in_output: detail.showInOutput !== false,
      old_owner: detail.oldOwner || null,
      affected_nondh_details: detail.affectedNondhDetails || [],
    };

    const { data: nondhDetailResult, error: nondhDetailsError } = await LandRecordService.createNondhDetail(nondhDetailData);
    
    if (nondhDetailsError) {
      throw new Error(`Failed to save nondh details: ${nondhDetailsError.message}`);
    }
    
    // Store the result along with original detail for Step 6 mapping
    if (nondhDetailResult) {
      const savedDetail = Array.isArray(nondhDetailResult) ? nondhDetailResult[0] : nondhDetailResult;
      savedNondhDetails.push({
        ...savedDetail,
        originalDetail: detail // Keep reference to original for owner processing
      });
    }
  }
}

      // Step 6: Save owner relations with foreign keys
let totalOwnersInserted = 0;
if (savedNondhDetails.length > 0) {
  for (const nondhDetail of savedNondhDetails) {
    const originalDetail = nondhDetail.originalDetail; // Use the stored reference

    if (!originalDetail) continue;

          // Process regular owners
    if (originalDetail.owners && originalDetail.owners.length > 0) {
      for (const owner of originalDetail.owners) {
        const area = parseArea(owner.area);
        const { error } = await LandRecordService.createNondhOwnerRelation({
          nondh_detail_id: nondhDetail.id,
          owner_name: owner.name,
          square_meters: area.value,
          area_unit: area.unit,
          survey_number: owner.surveyNumber || null,
          survey_number_type: owner.surveyNumberType || null
        });
        
        if (!error) totalOwnersInserted++; // Count successful inserts
      }
    }

    // Process new owners for transfer types
    if (originalDetail.newOwners && originalDetail.newOwners.length > 0) {
      for (const newOwner of originalDetail.newOwners) {
        const area = parseArea(newOwner.area);
        const { error } = await LandRecordService.createNondhOwnerRelation({
          nondh_detail_id: nondhDetail.id,
          owner_name: newOwner.name,
          square_meters: area.value,
          area_unit: area.unit,
          survey_number: newOwner.surveyNumber || null,
          survey_number_type: newOwner.surveyNumberType || null
        });
        
        if (!error) totalOwnersInserted++; // Count successful inserts
      }
    }
  }
}

      const stats = {
        yearSlabs: jsonData.yearSlabs?.length || 0,
        panipatraks: jsonData.panipatraks?.length || 0,
        farmers: jsonData.panipatraks?.reduce((sum, p) => sum + p.farmers.length, 0) || 0,
        nondhs: jsonData.nondhs?.length || 0,
        nondhDetails: jsonData.nondhDetails?.length || 0,
        totalOwners: totalOwnersInserted
      };

      setResult({
        success: true,
        message: 'Land record uploaded and processed successfully',
        stats,
        landRecordId
      });

    } catch (error) {
      console.error('Upload error:', error);
      setErrors([error.message || 'An unexpected error occurred']);
      setResult({ success: false, message: 'Upload failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/json') {
        setErrors(['Please upload a valid JSON file']);
        return;
      }
      setFile(selectedFile);
      setErrors([]);
      setResult(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          processUpload(jsonData);
        } catch (error) {
          setErrors(['Invalid JSON format. Please check your file and try again.']);
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileJson className="w-6 h-6" />
            Bulk Land Record Upload
          </h2>
          <button
            onClick={downloadSampleJSON}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Sample JSON
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
  <h3 className="font-semibold mb-2 flex items-center gap-2">
    <AlertCircle className="w-5 h-5" />
    Instructions
  </h3>
  <ul className="space-y-1 text-sm">
    <li>• <strong>Year Matching:</strong> Panipatrak year is automatically matched to correct year slab</li>
    <li>• <strong>Farmer Types:</strong> 
      <ul className="ml-4 mt-1">
        <li>- Regular farmers: No paikyNumber or ekatrikaranNumber needed</li>
        <li>- Paiky farmers: Provide only paikyNumber (positive integer)</li>
        <li>- Ekatrikaran farmers: Provide only ekatrikaranNumber (positive integer)</li>
        <li>- Cannot have both numbers for same farmer</li>
      </ul>
    </li>
    <li>• <strong>Nondh Types:</strong> Supports Kabjedaar, Varsai, Hukam, Vechand, Hakkami, Durasti, Bojo with type-specific fields</li>
    <li>• <strong>Foreign Keys:</strong> All relationships are automatically set</li>
    <li>• <strong>Area format:</strong> Provide either sqm OR acre + guntha (converted to sq_m)</li>
    <li>• <strong>Date format:</strong> All dates must be in ddmmyyyy format</li>
  </ul>
</div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="json-upload"
            disabled={loading}
          />
          <label
            htmlFor="json-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium">
                {file ? file.name : 'Click to upload JSON file'}
              </p>
              <p className="text-sm text-gray-500">or drag and drop</p>
            </div>
          </label>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 rounded-lg mb-6">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing land record with intelligent year matching and foreign key relationships...</span>
          </div>
        )}

        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Validation Errors ({errors.length})
            </h3>
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {errors.map((error, index) => (
                <li key={index} className="text-sm text-red-700">
                  • {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result?.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              {result.message}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
              <div className="bg-white rounded p-3">
                <div className="text-gray-500 text-xs">Year Slabs</div>
                <div className="text-2xl font-bold text-green-600">
                  {result.stats.yearSlabs}
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-gray-500 text-xs">Panipatraks</div>
                <div className="text-2xl font-bold text-green-600">
                  {result.stats.panipatraks}
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-gray-500 text-xs">Total Farmers</div>
                <div className="text-2xl font-bold text-green-600">
                  {result.stats.farmers}
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-gray-500 text-xs">Nondhs</div>
                <div className="text-2xl font-bold text-green-600">
                  {result.stats.nondhs}
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-gray-500 text-xs">Nondh Details</div>
                <div className="text-2xl font-bold text-green-600">
                  {result.stats.nondhDetails}
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-600 bg-white p-2 rounded">
              <strong>Land Record ID:</strong> {result.landRecordId}
            </div>
          </div>
        )}

        <div className="mt-6">
          <details className="bg-gray-50 rounded-lg p-4">
            <summary className="cursor-pointer font-semibold mb-2">
              View Complete Sample JSON Structure (All Nondh Types)
            </summary>
            <pre className="mt-3 text-xs overflow-x-auto bg-white p-3 rounded border max-h-96">
              {JSON.stringify(sampleJSON, null, 2)}
            </pre>
          </details>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-amber-800">Database Relationships</h3>
          <div className="text-sm space-y-2">
            <p><strong>Foreign Key Mapping:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• <code>yearslab_id</code> in panipatraks → year_slabs table</li>
              <li>• <code>nondh_id</code> in nondh_details → nondhs table</li>
              <li>• <code>nondh_detail_id</code> in nondh_owner_relations → nondh_details table</li>
              <li>• <code>land_record_id</code> in all tables → land_records table</li>
            </ul>
            <p className="text-xs text-amber-700 mt-2">
              All foreign keys are automatically populated during the upload process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandRecordJSONUpload;
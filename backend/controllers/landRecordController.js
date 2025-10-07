import * as landRecordService from '../services/landRecordService.js';

// Lightweight validation - only check critical structure
const validateBasicStructure = (data) => {
  const errors = [];

  if (!data.basicInfo) {
    errors.push("Missing 'basicInfo' section");
  } else {
    const required = ['district', 'taluka', 'village'];
    required.forEach(field => {
      if (!data.basicInfo[field]) {
        errors.push(`Missing required field in basicInfo: ${field}`);
      }
    });

    if (!data.basicInfo.blockNo && !data.basicInfo.reSurveyNo) {
      errors.push("Basic info must have either 'blockNo' or 'reSurveyNo'");
    }
  }

  // Optional: Check if nondhs exist if nondhDetails exist
  if (data.nondhDetails && data.nondhDetails.length > 0) {
    if (!data.nondhs || data.nondhs.length === 0) {
      errors.push("nondhDetails require corresponding nondhs array");
    }
  }

  return errors;
};

export const uploadHandler = async (req, res) => {
  try {
    const jsonData = req.body;

    // Only validate critical structure
    const structuralErrors = validateBasicStructure(jsonData);
    if (structuralErrors.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid JSON structure', 
        errors: structuralErrors 
      });
    }

    // Let the service handle individual validation & skipping
    const result = await landRecordService.processUpload(jsonData);
    
    // Return result even if some details were skipped
    if (result.success) {
      return res.status(200).json(result);
    } else {
      // Complete failure (e.g., couldn't save land record)
      return res.status(500).json(result);
    }
  } catch (err) {
    console.error('uploadHandler error:', err);
    return res.status(500).json({ 
      success: false, 
      message: 'Upload failed', 
      error: err.message 
    });
  }
};
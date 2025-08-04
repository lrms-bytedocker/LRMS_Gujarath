# 🗄️ Complete Supabase Integration Guide for LRMS Forms

## Overview

This guide will help you integrate Supabase to save all form data from your LRMS forms into a database. Follow these steps in order.

## 📋 Prerequisites

- ✅ Supabase account and project created
- ✅ Environment variables configured (.env.local)
- ✅ @supabase/supabase-js package installed

## 🗃️ Phase 1: Database Schema Setup

### Step 1: Create Tables in Supabase Dashboard

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the SQL from `database-schema.sql` file

This will create:

- `land_records` - Main table for basic land information
- `year_slabs` - Year and slab data
- `slab_entries` - Individual slab entries
- `farmers` - Farmer information
- `panipatraks` - Panipatrak records
- `nondhs` - Nondh records
- `nondh_details` - Detailed nondh information

### Step 2: Create Storage Bucket

1. Go to Storage in Supabase dashboard
2. Create new bucket named `land-documents`
3. Set it to public if you want public access to uploaded documents

## 🔧 Phase 2: Update Your Code

### Step 1: Replace Supabase Library

Replace the content of `lib/supabase.ts` with `lib/supabase-enhanced.ts`:

```bash
# Backup current file
mv lib/supabase.ts lib/supabase-backup.ts

# Use enhanced version
mv lib/supabase-enhanced.ts lib/supabase.ts
```

### Step 2: Update Context (Optional - Enhanced Version)

You can optionally replace your context with the enhanced version that includes auto-save:

```bash
# Backup current context
mv contexts/land-record-context.tsx contexts/land-record-context-backup.tsx

# Use enhanced version
mv contexts/land-record-context-enhanced.tsx contexts/land-record-context.tsx
```

### Step 3: Add Save Functionality to Forms

#### Option A: Simple Manual Save (Recommended)

Update your `land-forms-container.tsx` to add save buttons:

```tsx
// Add these imports
import { useLandRecord } from "@/contexts/land-record-context";
import { LandRecordService } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

// In your component, add save functionality
const { landBasicInfo, yearSlabs, nondhs, nondhDetails } = useLandRecord();
const { toast } = useToast();

const handleSaveStep = async () => {
  if (!landBasicInfo) {
    toast({
      title: "Please fill basic information first",
      variant: "destructive",
    });
    return;
  }

  const landRecordData = {
    district: landBasicInfo.district,
    taluka: landBasicInfo.taluka,
    village: landBasicInfo.village,
    area_value: landBasicInfo.area.value,
    area_unit: landBasicInfo.area.unit,
    s_no_type: landBasicInfo.sNoType,
    s_no: landBasicInfo.sNo,
    is_promulgation: landBasicInfo.isPromulgation,
    block_no: landBasicInfo.blockNo,
    re_survey_no: landBasicInfo.reSurveyNo,
    integrated_712: landBasicInfo.integrated712,
    current_step: activeStep,
    status: "draft",
  };

  const { data, error } = await LandRecordService.saveLandRecord(
    landRecordData
  );

  if (error) {
    toast({ title: "Error saving data", variant: "destructive" });
    console.error(error);
  } else {
    toast({ title: "Data saved successfully!" });
    // Store the ID for future updates
    localStorage.setItem("currentLandRecordId", data.id);
  }
};

// Add save button to your navigation
<Button onClick={handleSaveStep} variant="outline">
  Save Progress
</Button>;
```

#### Option B: Auto-save (Advanced)

Use the enhanced context which automatically saves data when moving between steps.

## 🔄 Phase 3: Form Integration

### Step 1: Update Land Basic Info Form

Add saving to your land basic info component:

```tsx
// In land-basic-info.tsx
import { LandRecordService } from "@/lib/supabase";

const handleSave = async () => {
  const recordData = {
    district: formData.district,
    taluka: formData.taluka,
    village: formData.village,
    area_value: formData.area.value,
    area_unit: formData.area.unit,
    s_no_type: formData.sNoType,
    s_no: formData.sNo,
    is_promulgation: formData.isPromulgation,
    // ... other fields
  };

  const { data, error } = await LandRecordService.saveLandRecord(recordData);
  if (!error) {
    toast({ title: "Basic info saved!" });
    setLandBasicInfo(formData); // Update context
  }
};
```

### Step 2: Update Other Forms

Apply similar patterns to:

- `year-slabs.tsx` - Save slab data
- `panipatrak.tsx` - Save farmer data
- `nondh-add.tsx` - Save nondh records
- `nondh-details.tsx` - Save detailed nondh info

## 📊 Phase 4: Data Flow

### Save Flow:

1. User fills form → 2. Data stored in context → 3. Save button clicked → 4. Data sent to Supabase

### Load Flow:

1. User opens existing record → 2. Data loaded from Supabase → 3. Context updated → 4. Forms populated

## 🧪 Phase 5: Testing

### Step 1: Test Basic Save

1. Fill out Land Basic Info form
2. Click save
3. Check Supabase dashboard to see record created

### Step 2: Test File Upload

1. Upload a document in any form
2. Verify file appears in Storage bucket
3. Check that file URL is saved in database

### Step 3: Test Complete Flow

1. Go through all 6 steps
2. Fill out each form
3. Save at each step
4. Submit final form
5. Verify all data in database

## 🚨 Common Issues & Solutions

### Issue 1: "Cannot find module" errors

**Solution:** Make sure all imports are correct and files exist

### Issue 2: Supabase connection errors

**Solution:** Check environment variables are correctly set

### Issue 3: Database permission errors

**Solution:** Verify RLS policies are set up correctly

### Issue 4: File upload fails

**Solution:** Check storage bucket exists and has correct permissions

## 📱 Phase 6: Enhanced Features (Optional)

### Auto-save on field change:

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    if (formData.district) {
      handleSave();
    }
  }, 2000); // Auto-save after 2 seconds of no typing

  return () => clearTimeout(timer);
}, [formData]);
```

### Load existing records:

```tsx
const loadExistingRecord = async (recordId: string) => {
  const { data, error } = await LandRecordService.getCompleteRecord(recordId);
  if (data) {
    // Populate all forms with existing data
    setLandBasicInfo(data.landRecord);
    setYearSlabs(data.yearSlabs);
    // ... etc
  }
};
```

## ✅ Final Checklist

- [ ] Database tables created
- [ ] Storage bucket created
- [ ] Enhanced supabase.ts implemented
- [ ] Save functionality added to forms
- [ ] File upload working
- [ ] Data validation in place
- [ ] Error handling implemented
- [ ] Testing completed
- [ ] Auto-save configured (optional)

## 🎯 Result

After completing this integration:

1. ✅ **All form data will be saved to Supabase**
2. ✅ **Users can continue forms later**
3. ✅ **File uploads work seamlessly**
4. ✅ **Data is validated and secure**
5. ✅ **Progress is tracked per step**
6. ✅ **Complete audit trail maintained**

Your LRMS forms will now have full database integration with Supabase!

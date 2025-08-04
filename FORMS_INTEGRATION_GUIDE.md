# LRMS Forms Integration Guide

## Overview

This document explains how to integrate forms from the LRMS_Forms-main project into the LRMS_ERP-main project.

## What Has Been Set Up

### 1. Forms Directory Structure

```
components/
  forms/
    ├── index.ts                    # Export file for all forms
    ├── land-forms-container.tsx    # Main container with step navigation
    ├── basic-details-form.tsx      # Basic land details form
    ├── location-form.tsx           # Location information form
    ├── ownership-form.tsx          # Ownership details form
    └── documents-form.tsx          # Document upload form
```

### 2. New Route Created

- **Route**: `/land-master/forms`
- **File**: `app/land-master/forms/page.tsx`
- **Purpose**: Displays all land registration forms in a new page

### 3. Modified Land Master Page

- **File**: `app/land-master/page.tsx`
- **Change**: "Add New Land" button now navigates to `/land-master/forms` instead of opening a dialog
- **Navigation**: Uses Next.js router for page navigation

## How to Integrate Your LRMS_Forms-main Project

### Step 1: Copy Your Forms

1. Navigate to your `LRMS_Forms-main` project
2. Copy all your form components to `components/forms/` directory
3. Replace the placeholder forms with your actual forms

### Step 2: Update Form Container

1. Open `components/forms/land-forms-container.tsx`
2. Replace the imported form components with your actual forms:
   ```tsx
   // Replace these imports with your actual forms
   import { YourBasicForm } from "./your-basic-form";
   import { YourLocationForm } from "./your-location-form";
   // ... etc
   ```

### Step 3: Update Form Steps

1. Modify the `steps` array in `land-forms-container.tsx` to match your forms
2. Update the `TabsContent` sections to use your form components
3. Adjust form validation and completion logic as needed

### Step 4: Update Exports

1. Open `components/forms/index.ts`
2. Export your actual form components

## Form Container Features

### Multi-Step Navigation

- Progress indicator showing completion status
- Next/Previous navigation between forms
- Step completion tracking

### Form Validation

- Each form can implement its own validation
- Required fields validation
- Form completion callbacks

### Document Upload

- File upload functionality
- Multiple document types support
- File size validation
- Preview and remove uploaded files

## Customization Options

### 1. Form Steps

You can customize the form steps by modifying the `steps` array:

```tsx
const steps: FormStep[] = [
  {
    id: "step1",
    title: "Your Step Title",
    description: "Step description",
    icon: <YourIcon className="h-4 w-4" />,
    completed: completedSteps.has("step1"),
  },
  // ... more steps
];
```

### 2. Form Layout

- Each form is wrapped in a Card component
- Responsive grid layout for form fields
- Consistent styling using Tailwind CSS

### 3. Navigation

- Back button returns to Land Master page
- Save Draft functionality (can be connected to backend)
- Final submission button

## Data Flow

### Form Data Handling

1. Each form manages its own state using React Hook Form
2. Form data is logged to console (can be sent to backend)
3. Completion status is tracked in the container

### Integration with LRMS Context

- Forms can access the LRMS context for shared data
- Can update global state when forms are completed
- Seamless integration with existing land records

## Testing

### Development Server

The application is running at: http://localhost:3000

### Navigation Flow

1. Go to Land Master page: http://localhost:3000/land-master
2. Click "Add New Land" button
3. Forms page opens: http://localhost:3000/land-master/forms
4. Navigate through forms using step buttons or Next/Previous

## Next Steps

1. **Copy Your Forms**: Replace placeholder forms with your actual forms from LRMS_Forms-main
2. **Backend Integration**: Connect form submissions to your backend API
3. **Validation**: Implement proper form validation using Zod schemas
4. **State Management**: Update LRMS context with new land records
5. **File Upload**: Connect document upload to your file storage solution

## Troubleshooting

### TypeScript Errors

- Make sure all form components are properly typed
- Update imports if you change component names
- Check that all required props are passed to forms

### Navigation Issues

- Verify Next.js routing is working correctly
- Check that useRouter is imported from 'next/navigation'
- Ensure all pages are in the correct directory structure

### Styling Issues

- All components use Tailwind CSS classes
- Check that your forms follow the same styling patterns
- Use the existing UI components from `components/ui/`

## Support

If you encounter any issues while integrating your forms, check:

1. Console for JavaScript errors
2. Network tab for API call issues
3. Component imports and exports
4. TypeScript compilation errors

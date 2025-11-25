# Admin Image Upload Guide

## Changes Made to Fix Image Upload Issue

### Problem
- The `collectors` table had a `profile_image` field but the app was trying to use `profile_image_url`
- Image uploads to Supabase Storage bucket `DriverProfiles` were failing
- There was a mismatch between database schema and application code

### Solution
We've switched from using Supabase Storage buckets to storing images as base64 strings directly in the database. This is simpler and doesn't require bucket configuration.

---

## Database Changes

Run this SQL in your Supabase SQL Editor:

```sql
-- Rename the column from profile_image to profile_image_base64
ALTER TABLE public.collectors 
  RENAME COLUMN profile_image TO profile_image_base64;
```

Or run the migration file:
```bash
# If using Supabase CLI
supabase db push
```

---

## Updated Table Schema

```sql
CREATE TABLE public.collectors (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  collector_id character varying(50) NULL DEFAULT (
    'COL'::text || (
      EXTRACT(epoch FROM now())
    )::text
  ),
  "firstName" character varying(255) NOT NULL,
  "lastName" character varying(255) NULL,
  contact character varying(20) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  password text NULL,
  driver text NULL,
  crew json NULL,
  status text NULL,
  profile_image_base64 text NULL,  -- Changed from profile_image
  CONSTRAINT collectors_pkey PRIMARY KEY (id),
  CONSTRAINT collectors_collector_id_key UNIQUE (collector_id)
) TABLESPACE pg_default;
```

---

## For Admin Code (Web Dashboard/Panel)

If you have an admin interface where you create collectors and upload images, update it as follows:

### Option 1: Base64 Encoding (Recommended)

```javascript
// Admin form for creating collector with image
async function createCollectorWithImage(collectorData, imageFile) {
  try {
    // Convert image to base64
    const base64Image = await convertFileToBase64(imageFile);
    
    // Insert collector with base64 image
    const { data, error } = await supabase
      .from('collectors')
      .insert([{
        firstName: collectorData.firstName,
        lastName: collectorData.lastName,
        driver: collectorData.driver,
        contact: collectorData.contact,
        password: collectorData.password,
        crew: collectorData.crew,
        status: collectorData.status || 'active',
        profile_image_base64: base64Image  // Store as base64
      }])
      .select();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating collector:', error);
    throw error;
  }
}

// Helper function to convert file to base64
function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

### Option 2: React/Next.js Admin Form Example

```jsx
import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function CreateCollectorForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    driver: '',
    contact: '',
    password: '',
    crew: [],
    status: 'active'
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [base64Image, setBase64Image] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create preview
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setBase64Image(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('collectors')
        .insert([{
          firstName: formData.firstName,
          lastName: formData.lastName,
          driver: formData.driver,
          contact: formData.contact,
          password: formData.password, // Remember to hash this in production!
          crew: formData.crew,
          status: formData.status,
          profile_image_base64: base64Image
        }])
        .select();

      if (error) throw error;

      alert('Collector created successfully!');
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        driver: '',
        contact: '',
        password: '',
        crew: [],
        status: 'active'
      });
      setImagePreview(null);
      setBase64Image(null);
    } catch (error) {
      console.error('Error creating collector:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="First Name"
        value={formData.firstName}
        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
        required
      />
      
      <input
        type="text"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
      />
      
      <input
        type="text"
        placeholder="Driver Name"
        value={formData.driver}
        onChange={(e) => setFormData({...formData, driver: e.target.value})}
      />
      
      <input
        type="tel"
        placeholder="Contact Number"
        value={formData.contact}
        onChange={(e) => setFormData({...formData, contact: e.target.value})}
      />
      
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
      />

      {/* Profile Image Upload */}
      <div>
        <label>Profile Image:</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
        />
        {imagePreview && (
          <img 
            src={imagePreview} 
            alt="Preview" 
            style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%' }}
          />
        )}
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Collector'}
      </button>
    </form>
  );
}
```

---

## Mobile App Changes (Already Done)

The mobile app in `app/collector/profile.jsx` has been updated to:
1. Store images as base64 strings instead of uploading to storage bucket
2. Use `profile_image_base64` field instead of `profile_image_url`
3. Convert picked images to base64 format automatically

---

## Important Notes

### Base64 Storage Considerations

**Pros:**
- ✅ No need for storage bucket configuration
- ✅ Simpler implementation
- ✅ Images are part of database backups
- ✅ No additional storage costs

**Cons:**
- ⚠️ Increases database size (base64 is ~33% larger than binary)
- ⚠️ Not recommended for very large images (keep images under 500KB)
- ⚠️ Slightly slower query performance with large images

**Recommendation:** 
- Keep image quality at 0.7-0.8 and resize to max 500x500px
- For production with many users, consider setting up proper bucket storage later

---

## Alternative: If You Want to Use Storage Buckets

If you prefer to use Supabase Storage (better for production), follow these steps:

### 1. Create Storage Bucket
```sql
-- In Supabase Dashboard > Storage > Create Bucket
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('DriverProfiles', 'DriverProfiles', true);
```

### 2. Set Bucket Policies
```sql
-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'DriverProfiles');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'DriverProfiles');

-- Allow users to update their own images
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'DriverProfiles');
```

### 3. Update Table Schema
```sql
ALTER TABLE public.collectors 
  RENAME COLUMN profile_image_base64 TO profile_image_url;
```

### 4. Revert Mobile App Code
Use the original upload logic with storage buckets.

---

## Testing

After making these changes:

1. Run the SQL migration
2. Test creating a new collector with an image in your admin panel
3. Test uploading an image from the mobile app
4. Verify the image displays correctly in the collector profile

---

## Need Help?

If you're still having issues:
1. Check Supabase logs for any errors
2. Verify the table schema matches the updated version
3. Ensure your Supabase project has the latest migrations
4. Check that the image size is reasonable (< 500KB recommended)


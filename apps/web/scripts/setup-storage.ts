import { supabaseAdmin } from '../src/lib/supabase';

async function setupStorage() {
  try {
    console.log('Creating storage bucket...');

    // Create the 'files' bucket
    const { data, error } = await supabaseAdmin.storage.createBucket('files', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
      ]
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✓ Bucket "files" already exists');
      } else {
        console.error('Error creating bucket:', error);
        throw error;
      }
    } else {
      console.log('✓ Bucket "files" created successfully');
    }

    console.log('\nStorage setup complete!');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setupStorage();

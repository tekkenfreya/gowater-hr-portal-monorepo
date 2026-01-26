import { supabaseAdmin } from './supabase';
import { logger } from './logger';

export interface StoredFile {
  id: string;
  name: string;
  original_name: string;
  file_path: string;
  size: number;
  mime_type: string;
  category: string;
  uploaded_by: number;
  uploaded_at: string;
  public_url?: string;
}

export interface FileUploadResult {
  success: boolean;
  file?: StoredFile;
  error?: string;
}

export class FileService {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds the maximum limit of ${this.formatFileSize(this.MAX_FILE_SIZE)}`
      };
    }

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed. Please upload a supported file format.`
      };
    }

    return { valid: true };
  }

  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  static getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType === 'application/pdf') return 'documents';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'documents';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheets';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentations';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archives';
    return 'documents';
  }

  static async uploadFile(file: File, userId: number, customCategory?: string): Promise<FileUploadResult> {
    try {
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `files/${userId}/${fileName}`;

      // Upload to Supabase Storage using admin client to bypass RLS
      const { error: uploadError } = await supabaseAdmin.storage
        .from('files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        logger.error('Upload error', uploadError);
        return { success: false, error: 'Failed to upload file to storage' };
      }

      // Get public URL
      const { data: publicUrlData } = supabaseAdmin.storage
        .from('files')
        .getPublicUrl(filePath);

      // Save file metadata to database
      const category = customCategory || this.getFileCategory(file.type);
      const fileRecord = {
        id: crypto.randomUUID(),
        name: fileName,
        original_name: file.name,
        file_path: filePath,
        size: file.size,
        mime_type: file.type,
        category: category,
        uploaded_by: userId,
        uploaded_at: new Date().toISOString(),
        public_url: publicUrlData.publicUrl
      };

      const { data: dbData, error: dbError } = await supabaseAdmin
        .from('files')
        .insert(fileRecord)
        .select()
        .single();

      if (dbError) {
        logger.error('Database error', dbError);
        // Try to clean up uploaded file
        await supabaseAdmin.storage.from('files').remove([filePath]);
        return { success: false, error: 'Failed to save file metadata' };
      }

      return { success: true, file: dbData };
    } catch (error) {
      logger.error('File upload error', error);
      return { success: false, error: 'Unexpected error during file upload' };
    }
  }

  static async getUserFiles(userId: number, category?: string): Promise<StoredFile[]> {
    try {
      let query = supabaseAdmin
        .from('files')
        .select('*')
        .eq('uploaded_by', userId)
        .order('uploaded_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching user files', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getUserFiles', error);
      return [];
    }
  }

  static async getAllFiles(category?: string): Promise<StoredFile[]> {
    try {
      let query = supabaseAdmin
        .from('files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching all files', error);
        return [];
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAllFiles', error);
      return [];
    }
  }

  static async deleteFile(fileId: string, userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Get file record first
      const { data: fileRecord, error: fetchError } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('id', fileId)
        .eq('uploaded_by', userId)
        .single();

      if (fetchError || !fileRecord) {
        return { success: false, error: 'File not found or access denied' };
      }

      // Delete from storage
      const { error: storageError } = await supabaseAdmin.storage
        .from('files')
        .remove([fileRecord.file_path]);

      if (storageError) {
        logger.error('Storage deletion error', storageError);
        // Continue to delete database record even if storage deletion fails
      }

      // Delete from database
      const { error: dbError } = await supabaseAdmin
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) {
        logger.error('Database deletion error', dbError);
        return { success: false, error: 'Failed to delete file record' };
      }

      return { success: true };
    } catch (error) {
      logger.error('File deletion error', error);
      return { success: false, error: 'Unexpected error during file deletion' };
    }
  }

  static async getFileDownloadUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from('files')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        logger.error('Error creating signed URL', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      logger.error('Error in getFileDownloadUrl', error);
      return null;
    }
  }
}

export default FileService;
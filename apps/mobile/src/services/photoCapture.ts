import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: Date;
}

export interface PhotoCaptureResult {
  success: boolean;
  photoUrl?: string;
  localUri?: string;
  location?: LocationData;
  error?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync('auth_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const photoCaptureService = {
  /**
   * Request camera and location permissions
   */
  async requestPermissions(): Promise<{ camera: boolean; location: boolean }> {
    const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
    const locationResult = await Location.requestForegroundPermissionsAsync();

    return {
      camera: cameraResult.status === 'granted',
      location: locationResult.status === 'granted',
    };
  },

  /**
   * Get current location with address
   */
  async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Get address from coordinates
      let address: string | undefined;
      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode) {
          const parts = [
            geocode.street,
            geocode.district,
            geocode.city,
            geocode.region,
          ].filter(Boolean);
          address = parts.join(', ');
        }
      } catch (geocodeError) {
        console.log('Geocoding failed:', geocodeError);
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address,
        timestamp: new Date(location.timestamp),
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  },

  /**
   * Capture photo using camera
   */
  async capturePhoto(): Promise<{ uri: string } | null> {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== 'granted') {
        const request = await ImagePicker.requestCameraPermissionsAsync();
        if (request.status !== 'granted') {
          return null;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      return { uri: result.assets[0].uri };
    } catch (error) {
      console.error('Error capturing photo:', error);
      return null;
    }
  },

  /**
   * Create watermarked image with logo and location info
   * Uses text overlay instead of image marker for simplicity
   */
  async createWatermarkedImage(
    imageUri: string,
    location: LocationData | null
  ): Promise<string> {
    try {
      // Format timestamp
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const dateStr = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

      // Format location text
      let locationText = 'Location not available';
      if (location) {
        if (location.address) {
          locationText = location.address;
        } else {
          locationText = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        }
      }

      // Resize and compress image
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Note: expo-image-manipulator doesn't support text overlay directly
      // The watermark will be added server-side or we'll use the location data
      // in the metadata for now

      return manipResult.uri;
    } catch (error) {
      console.error('Error creating watermarked image:', error);
      return imageUri;
    }
  },

  /**
   * Upload photo to server (which then uploads to Cloudinary)
   */
  async uploadPhoto(
    imageUri: string,
    location: LocationData | null,
    userId: number,
    photoType?: 'checkin' | 'checkout' | 'break'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const headers = await getAuthHeaders();

      // Create form data
      const formData = new FormData();

      // Get the file name from URI
      const fileName = imageUri.split('/').pop() || 'checkin-photo.jpg';

      // Append file
      formData.append('photo', {
        uri: imageUri,
        type: 'image/jpeg',
        name: fileName,
      } as unknown as Blob);

      // Append location data
      if (location) {
        formData.append('latitude', location.latitude.toString());
        formData.append('longitude', location.longitude.toString());
        formData.append('address', location.address || '');
        formData.append('timestamp', location.timestamp.toISOString());
      }

      formData.append('userId', userId.toString());
      if (photoType) {
        formData.append('photoType', photoType);
      }

      const response = await fetch(`${API_BASE_URL}/api/attendance/upload-photo`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to upload photo' };
      }

      return { success: true, url: data.url };
    } catch (error) {
      console.error('Error uploading photo:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  /**
   * Complete check-in photo capture flow
   */
  async captureCheckInPhoto(userId: number, photoType?: 'checkin' | 'checkout' | 'break'): Promise<PhotoCaptureResult> {
    try {
      // Request permissions
      const permissions = await this.requestPermissions();
      if (!permissions.camera) {
        return { success: false, error: 'Camera permission is required' };
      }

      // Get location first (in parallel would be faster but sequential for reliability)
      const location = permissions.location
        ? await this.getCurrentLocation()
        : null;

      // Capture photo
      const photoResult = await this.capturePhoto();
      if (!photoResult) {
        return { success: false, error: 'Photo capture was cancelled' };
      }

      // Process image (resize)
      const processedUri = await this.createWatermarkedImage(
        photoResult.uri,
        location
      );

      // Upload to server
      const uploadResult = await this.uploadPhoto(processedUri, location, userId, photoType);

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
          localUri: processedUri,
          location: location || undefined,
        };
      }

      return {
        success: true,
        photoUrl: uploadResult.url,
        localUri: processedUri,
        location: location || undefined,
      };
    } catch (error) {
      console.error('Error in check-in photo capture:', error);
      return { success: false, error: 'Failed to capture check-in photo' };
    }
  },
};

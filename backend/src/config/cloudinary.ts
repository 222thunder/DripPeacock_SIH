import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
};

export const uploadToCloudinary = (
  fileBuffer: Buffer,
  folder: string = 'inspections'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    // If no credentials, just return a fake URL or empty to prevent crashing if user hasn't set it up
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn('Cloudinary is not configured. Falling back to local fake URL.');
      return resolve({
        url: 'https://via.placeholder.com/600x400?text=Cloudinary+Not+Configured',
        publicId: '',
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result?.secure_url) {
          resolve({ url: result.secure_url, publicId: result.public_id });
        } else {
          reject(error || new Error('Cloudinary upload failed'));
        }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/** Best-effort cleanup of an uploaded asset. No-op when Cloudinary is unset or publicId is empty. */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  if (!publicId || !process.env.CLOUDINARY_CLOUD_NAME) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Failed to delete Cloudinary asset:', publicId, err);
  }
};

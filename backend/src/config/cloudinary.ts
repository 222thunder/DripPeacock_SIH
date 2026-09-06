import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = (fileBuffer: Buffer, folder: string = 'inspections'): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If no credentials, just return a fake URL or empty to prevent crashing if user hasn't set it up
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn('Cloudinary is not configured. Falling back to local fake URL.');
      return resolve('https://via.placeholder.com/600x400?text=Cloudinary+Not+Configured');
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

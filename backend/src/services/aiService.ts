import axios from 'axios';
import FormData from 'form-data';

export interface AnalysisResponse {
  [key: string]: any;
}

export const analyzeImage = async (
  imageBuffer: Buffer,
  filename: string,
  mimetype: string,
  category?: string
): Promise<AnalysisResponse> => {
  const baseUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  const aiServiceUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const formData = new FormData();
  formData.append('file', imageBuffer, { filename, contentType: mimetype });
  
  if (category) {
    formData.append('category', category);
  }

  try {
    const response = await axios.post(`${aiServiceUrl}/analyze`, formData, {
      headers: formData.getHeaders(),
      timeout: 300000, // 5 minutes
    });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status || 'Unknown';
    const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    throw new Error(`AI Service /analyze failed (HTTP ${status}): ${detail.slice(0, 200)}`);
  }
};

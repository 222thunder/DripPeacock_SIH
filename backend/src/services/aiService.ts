export interface AnalysisResponse {
  [key: string]: any;
}

export const analyzeImage = async (
  imageBuffer: Buffer,
  filename: string,
  mimetype: string,
  category?: string
): Promise<AnalysisResponse> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimetype });
  formData.append('file', blob, filename);
  
  if (category) {
    formData.append('category', category);
  }

  const response = await fetch(`${aiServiceUrl}/analyze`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`AI Service /analyze failed (HTTP ${response.status}): ${detail.slice(0, 200)}`);
  }

  return response.json();
};

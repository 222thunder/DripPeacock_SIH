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
  });

  if (!response.ok) {
    throw new Error(`AI Service /analyze failed with status ${response.status}`);
  }

  return response.json();
};

export const parseText = async (rawText: string): Promise<any> => {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
  
  const response = await fetch(`${aiServiceUrl}/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: rawText }),
  });

  if (!response.ok) {
    throw new Error(`AI Service /parse failed with status ${response.status}`);
  }

  return response.json();
};

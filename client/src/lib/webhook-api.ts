import { apiRequest } from "./queryClient";

export interface WebhookResponse {
  userMessage: {
    id: string;
    content: string;
    sender: string;
    inputType: string;
    timestamp: string;
  };
  slappyMessage: {
    id: string;
    content: string;
    sender: string;
    inputType: string;
    timestamp: string;
  };
  response: string;
}

export async function sendMessageToSlapy(
  message: string,
  inputType: 'text' | 'voice' = 'text'
): Promise<WebhookResponse> {
  const response = await apiRequest('POST', '/api/webhook/slapy', {
    message,
    inputType,
  });
  
  return response.json();
}

export async function generateSpeech(text: string): Promise<string> {
  const response = await apiRequest('POST', '/api/tts', { text });
  const data = await response.json();
  return data.audioData;
}

export async function fetchMessages() {
  const response = await apiRequest('GET', '/api/messages');
  return response.json();
}

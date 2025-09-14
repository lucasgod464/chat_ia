import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertChatMessageSchema } from "@shared/schema";
import { z } from "zod";

const webhookRequestSchema = z.object({
  message: z.string().min(1),
  inputType: z.enum(['text', 'voice']).default('text'),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat messages endpoints
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getAllMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse(req.body);
      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  // Webhook integration with n8n
  app.post("/api/webhook/slapy", async (req, res) => {
    try {
      const { message, inputType } = webhookRequestSchema.parse(req.body);
      
      // Save user message
      const userMessage = await storage.createMessage({
        content: message,
        sender: 'user',
        inputType: inputType || 'text',
      });

      // Send to n8n webhook
      const webhookUrl = "https://n8n.yuccie.pro/webhook/n8n";
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook request failed: ${webhookResponse.statusText}`);
      }

      const webhookData = await webhookResponse.json();
      const slappyResponse = webhookData.output || "Desculpe, não consegui processar sua mensagem.";

      // Save Slapy response
      const slappyMessage = await storage.createMessage({
        content: slappyResponse,
        sender: 'slapy',
        inputType: 'text',
      });

      res.json({
        userMessage,
        slappyMessage,
        response: slappyResponse,
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  // Text-to-speech endpoint (ElevenLabs integration)
  app.post("/api/tts", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
      
      if (!elevenLabsApiKey) {
        throw new Error("ElevenLabs API key not configured");
      }

      const elevenLabsResponse = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!elevenLabsResponse.ok) {
        throw new Error(`ElevenLabs API error: ${elevenLabsResponse.statusText}`);
      }

      const audioBuffer = await elevenLabsResponse.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');

      res.json({ audioData: `data:audio/mpeg;base64,${audioBase64}` });
    } catch (error) {
      console.error("Error generating speech:", error);
      res.status(500).json({ error: "Failed to generate speech" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

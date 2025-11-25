import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: `Transform this Japanese text into a visually stunning scene: "${text}". 
  Style: Blend traditional Japanese aesthetics with modern digital art. 
  Key elements: Include symbolic representations of the text's core themes. 
  Mood: Ethereal and imaginative. 
  Technical: 8K resolution with ukiyo-e inspired linework and neon accents.`,
      config: {
        responseModalities: ["Text","Image"],
      },
    });


    const parts = response?.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData) {
          return new Response(JSON.stringify({
            imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    throw new Error('No image generated from the response');
  } catch (error) {
    console.error('Error generating image:', error);
    return new Response(JSON.stringify({ error: "Failed to generate image" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
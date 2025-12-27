import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEN_AI_KEY = process.env.GEMINI_API_KEY;

if (!GEN_AI_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    let userMessage = '';
    let imageParts: any[] = []; // For future image support
    let audioPart: any = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      userMessage = (formData.get('message') as string) || '';
      const audioFile = formData.get('audio') as File;

      if (audioFile) {
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        
        audioPart = {
          inlineData: {
            data: base64Audio,
            mimeType: audioFile.type || 'audio/m4a',
          },
        };
      }
    } else {
      const body = await request.json();
      userMessage = body.message;
    }

    if (!userMessage && !audioPart) {
        return NextResponse.json({ error: 'Message or Audio is required' }, { status: 400 });
    }

    const parts = [];
    if (audioPart) parts.push(audioPart);
    if (userMessage) parts.push({ text: userMessage });
    
    // If only audio, add prompt
    if (audioPart && !userMessage) {
        parts.push({ text: "Listen to this audio and respond helpfuly." });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ success: true, reply: text });
  } catch (error) {
    console.error('Gemini API Error:', error);
    // @ts-ignore
    return NextResponse.json({ success: false, error: error.message || 'Unknown Error' }, { status: 500 });
  }
}

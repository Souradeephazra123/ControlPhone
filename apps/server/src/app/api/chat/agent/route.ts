import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dbConnect from '@/lib/mongodb';
import Note from '@/models/Note';

const GEN_AI_KEY = process.env.GEMINI_API_KEY;

if (!GEN_AI_KEY) {
  throw new Error('GEMINI_API_KEY is not defined');
}

const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const agentState = (formData.get('state') as string) || 'IDLE'; // IDLE | LISTENING | ACTION

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio' }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    const audioPart = {
      inlineData: {
        data: base64Audio,
        mimeType: audioFile.type || 'audio/m4a',
      },
    };

    let prompt = "";
    if (agentState === 'IDLE') {
        prompt = `
        Listen to this audio. Does the user clearly say the name "Ginger" (or similar sounding like "Jinger")? 
        If YES, return JSON: {"detected": true}. 
        If NO, return JSON: {"detected": false}.
        Only return the JSON.
        `;
    } else {
        // Active mode - process command
        prompt = `
        You are an AI agent named Ginger. Use the audio to determine the user's intent.
        Available actions:
        1. "CREATE_NOTE": If user wants to create a note, save it. Return {"action": "CREATE_NOTE", "content": "note text", "reply": "Saving note..."}
        2. "STOP": If user says "Stop" or "Cancel". Return {"action": "STOP", "reply": "Deactivating agent."}
        3. "UNKNOWN": If unclear. Return {"action": "UNKNOWN", "reply": "I didn't catch that."}
        
        Return ONLY the JSON.
        `;
    }

    const result = await model.generateContent([prompt, audioPart]);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();
    
    console.log("Agent Response:", text);
    const data = JSON.parse(text);

    // Business Logic Handling on Server
    if (data.action === 'CREATE_NOTE' && data.content) {
        await dbConnect();
        await Note.create({ content: data.content });
    }

    return NextResponse.json({ success: true, ...data });

  } catch (error) {
    console.error('Agent API Error:', error);
    // @ts-ignore
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

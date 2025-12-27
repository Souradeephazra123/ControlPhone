import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import axios from 'axios';

// const SERVER_URL = 'http://192.168.1.5:3000/api'; // Make sure this matches HomeScreen/AICreativeScreen

export type AgentState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'TALKING';

class AgentService {
  private recording: Audio.Recording | null = null;
  private isRunning: boolean = false;
  private currentState: AgentState = 'IDLE';
  private serverUrl: string = '';
  private onStateChange: ((state: AgentState) => void) | null = null;

  init(serverUrl: string, onStateChange: (state: AgentState) => void) {
    this.serverUrl = serverUrl;
    this.onStateChange = onStateChange;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop() {
    this.isRunning = false;
    this.stopRecording();
    this.setState('IDLE');
  }

  private setState(state: AgentState) {
    this.currentState = state;
    if (this.onStateChange) this.onStateChange(state);
  }

  private async loop() {
    while (this.isRunning) {
      try {
        // If we are talking, wait. If we are processing, WE SHOULD NOT BE HERE (logic error fix)
        // Check TALKING only.
        if (this.currentState === 'TALKING') {
           await new Promise(resolve => setTimeout(resolve, 1000));
           continue;
        }

        // Cycle start
        this.setState('LISTENING');
        
        await this.startRecording();
        await new Promise(resolve => setTimeout(resolve, 2500)); 
        const uri = await this.stopRecording();

        if (uri) {
           this.setState('PROCESSING');
           await this.processAudio(uri);
        }

        // Safety check: If we are still PROCESSING after the call, it means
        // - Error happened
        // - Or Success but no 'TALKING' state transition (e.g. detected: false)
        // In all these cases, we should proceed to next loop (which sets LISTENING)
        if (this.currentState === 'PROCESSING') {
             this.setState('IDLE'); // Reset momentarily before next loop sets LISTENING
        }

      } catch (e) {
        console.error("Agent Loop Error:", e);
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.setState('IDLE');
      }
    }
  }

  private async startRecording() {
    try {
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      this.recording = recording;
    } catch (e) {
      console.error("Failed to start agent recording", e);
    }
  }

  private async stopRecording() {
    if (!this.recording) return null;
    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      this.recording = null;
      return uri;
    } catch (e) {
      return null;
    }
  }

  private async processAudio(uri: string) {
    const formData = new FormData();
    formData.append('audio', { uri, type: 'audio/m4a', name: 'audio.m4a' } as any);
    // Determine state sent to server: if we are IDLE, we look for wake word. If LISTENING (active), we look for command.
    // Actually, I'll manage "Active Mode" logic here.
    // If I just heard "Ginger", I enter "LISTENING" mode locally for the NEXT loop? 
    // Or I send "IDLE" to server, server returns "detected: true".
    
    // Simplification: We have an internal "Active" flag? 
    // Let's rely on server state parameter.
    // But wait, the loop records every 2.5s.
    
    // Strategy:
    // If internal mode is IDLE: Send audio. Server checks for "Ginger".
    // If server says "detected: true": Agent speaks "What can I do?". Set internal mode to ACTIVE.
    // If internal mode is ACTIVE: Send audio. Server checks for intent.
    // If server returns reply: Speak reply. If action is STOP, Set internal mode to IDLE.

    const requestState = (window as any).agentActiveMode ? 'ACTIVE' : 'IDLE'; 
    formData.append('state', requestState);

    try {
        const validUrl = this.serverUrl.endsWith('/api') ? this.serverUrl : `${this.serverUrl}/api`;
        console.log(`[Agent] Sending audio to ${validUrl}/chat/agent (State: ${requestState})`);
        
        const response = await axios.post(`${validUrl}/chat/agent`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 5000 // Fail fast if unreachable
        });

        const data = response.data;

        if (requestState === 'IDLE') {
            if (data.detected) {
                console.log("Wake Word Detected!");
                (window as any).agentActiveMode = true; // Hacky state for now
                this.setState('TALKING');
                Speech.speak("I'm listening.", { onDone: () => this.setState('IDLE') }); 
                // Wait for speech to finish before next loop
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } else {
            // Active Mode
            if (data.reply) {
                this.setState('TALKING');
                Speech.speak(data.reply, { onDone: () => this.setState('IDLE') });
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            if (data.action === 'STOP') {
                (window as any).agentActiveMode = false;
            }
        }

    } catch (e) {
       console.error("Agent API Error:", e);
       if (axios.isAxiosError(e)) {
         console.error("Response data:", e.response?.data);
       }
    }
  }
}

export default new AgentService();

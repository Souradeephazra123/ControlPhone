import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import axios from 'axios';

// Replace with your actual server URL (10.0.2.2 for Android Emulator, or your local IP)
const SERVER_URL = 'http://192.168.0.91:3000/api'; // Must use LAN IP (localhost fails on device)

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

import SpeechRecognizer from '../components/SpeechRecognizer';
import * as Speech from 'expo-speech';

export default function AICreativeScreen() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isAgentMode, setIsAgentMode] = useState(false);
    const [agentStatus, setAgentStatus] = useState<'IDLE' | 'ACTIVE' | 'PROCESSING'>('IDLE');
    const [input, setInput] = useState('');
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [noteText, setNoteText] = useState('');
    const [showNoteInput, setShowNoteInput] = useState(false);

    const saveNote = async () => {
        if (!noteText.trim()) return;
        try {
            await axios.post(`${SERVER_URL}/notes`, { content: noteText });
            alert('Note saved!');
            setNoteText('');
            setShowNoteInput(false);
        } catch (error) {
            console.error(error);
            alert('Failed to save note');
        }
    };

    const sendMessage = async (text: string) => {
        if (!text.trim()) return;

        const newUserMsg: Message = { id: Date.now().toString(), text, sender: 'user' };
        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post(`${SERVER_URL}/chat`, { message: text });
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.data.reply,
                sender: 'ai'
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { id: Date.now().toString(), text: "Error connecting to AI.", sender: 'ai' }]);
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status === 'granted') {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

                // Prepare new recording
                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);
            } else {
                alert('Permission to access microphone is required!');
            }
        } catch (err) {
            console.error('Failed to start recording', err);
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        if (!recording) return;

        setIsRecording(false); // Update UI immediately
        setLoading(true);

        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null); // Clear state

            if (uri) {
                console.log('Recording stored at', uri);

                // Upload audio
                const formData = new FormData();
                formData.append('audio', {
                    uri: uri,
                    type: 'audio/m4a', // Using m4a from HIGH_QUALITY preset
                    name: 'recording.m4a',
                } as any);

                // Add empty message to indicate audio-only if needed, or handled by backend
                // formData.append('message', ''); 

                const response = await axios.post(`${SERVER_URL}/chat`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                const aiMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    text: response.data.reply,
                    sender: 'ai'
                };
                setMessages(prev => [...prev, aiMsg]);
            }
        } catch (error) {
            console.error('Failed to stop recording or upload', error);
            const errorMessage = axios.isAxiosError(error) ? error.response?.data?.error || error.message : (error as Error).message;
            setMessages(prev => [...prev, { id: Date.now().toString(), text: `Error: ${errorMessage}`, sender: 'ai' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSpeechResult = async (text: string) => {
        if (!isAgentMode || agentStatus === 'PROCESSING') return;

        const lower = text.toLowerCase();
        // console.log("Speech:", lower);

        if (agentStatus === 'IDLE') {
            if (lower.includes('ginger') || lower.includes('danger') || lower.includes('ninja')) {
                setAgentStatus('ACTIVE');
                Speech.speak("Yes?");
            }
        } else if (agentStatus === 'ACTIVE') {
            if (lower.includes('stop') || lower.includes('cancel') || lower.includes('thank you')) {
                Speech.speak("Turning off.");
                setIsAgentMode(false);
                setAgentStatus('IDLE');
                return;
            }

            if (lower.includes('create a note') || lower.includes('save a note') || lower.includes('take a note')) {
                setAgentStatus('PROCESSING');
                try {
                    const response = await axios.post(`${SERVER_URL}/chat`, {
                        message: `[AGENT_MODE] User said: "${text}". If they want to create a note, extract content and reply "Saving note: <content>". If just chatting, reply normally.`
                    });

                    const reply = response.data.reply;
                    Speech.speak(reply);
                    if (reply.toLowerCase().includes("saving note")) {
                        const content = lower.replace(/.*(note saying|note that|note)\s+/, '');
                        await axios.post(`${SERVER_URL}/notes`, { content: content });
                    }
                } catch (e) {
                    Speech.speak("Sorry, I had an issue.");
                } finally {
                    setAgentStatus('IDLE');
                }
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {isAgentMode && (
                <SpeechRecognizer
                    isListening={isAgentMode && agentStatus !== 'PROCESSING'}
                    onSpeechResult={handleSpeechResult}
                />
            )}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AI Creative</Text>
                <TouchableOpacity
                    style={[styles.agentButton, isAgentMode && styles.agentButtonActive]}
                    onPress={() => {
                        if (isAgentMode) {
                            setIsAgentMode(false);
                            setAgentStatus('IDLE');
                            Speech.stop();
                        } else {
                            setIsAgentMode(true);
                        }
                    }}
                >
                    <Text style={styles.agentButtonText}>{isAgentMode ? `Agent: ${agentStatus}` : 'Start Agent'}</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.chatContainer}
                renderItem={({ item }) => (
                    <View style={[
                        styles.bubble,
                        item.sender === 'user' ? styles.userBubble : styles.aiBubble
                    ]}>
                        <Text style={item.sender === 'user' ? styles.userText : styles.aiText}>
                            {item.text}
                        </Text>
                    </View>
                )}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingContainer}
            >
                {showNoteInput && (
                    <View style={styles.noteInputContainer}>
                        <TextInput
                            style={styles.noteInput}
                            value={noteText}
                            onChangeText={setNoteText}
                            placeholder="Enter note..."
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity style={styles.saveNoteButton} onPress={saveNote}>
                            <Text style={styles.textWhite}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setShowNoteInput(false)}>
                            <Text style={styles.textWhite}>X</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.noteButton} onPress={() => setShowNoteInput(!showNoteInput)}>
                        <Text style={styles.micText}>📝</Text>
                    </TouchableOpacity>
                    <View style={styles.controlsRow}>
                        <TextInput
                            style={styles.input}
                            value={input}
                            onChangeText={setInput}
                            placeholder="Type a message..."
                            placeholderTextColor="#666"
                        />

                        <TouchableOpacity
                            style={styles.sendButton}
                            onPress={() => sendMessage(input)}
                        >
                            <Text style={{ color: 'white' }}>Send</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.micButton, isRecording && styles.micActive]}
                            onPressIn={startRecording}
                            onPressOut={stopRecording}
                        >
                            <Text style={styles.micText}>🎤</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    chatContainer: {
        padding: 16,
        paddingBottom: 80,
    },
    bubble: {
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
        maxWidth: '80%',
    },
    userBubble: {
        backgroundColor: '#3B82F6',
        alignSelf: 'flex-end',
    },
    aiBubble: {
        backgroundColor: '#2A2A2A',
        alignSelf: 'flex-start',
    },
    userText: {
        color: '#fff',
    },
    aiText: {
        color: '#eee',
    },
    keyboardAvoidingContainer: {
        // This style is for the KeyboardAvoidingView itself,
        // which should typically just manage its children's position.
        // The actual input styling is in inputContainer.
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#1E1E1E',
        alignItems: 'center',
    },
    noteInputContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#333',
        marginBottom: 10,
        borderRadius: 10,
    },
    noteInput: {
        flex: 1,
        color: 'white',
        backgroundColor: '#222',
        padding: 8,
        borderRadius: 5,
    },
    saveNoteButton: {
        marginLeft: 10,
        backgroundColor: 'green',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 5,
    },
    cancelButton: {
        marginLeft: 5,
        backgroundColor: 'red',
        justifyContent: 'center',
        padding: 10,
        borderRadius: 5,
    },
    textWhite: { color: 'white' },
    noteButton: {
        marginRight: 8,
        justifyContent: 'center',
    },
    controlsRow: {
        flex: 1, // Allow controls to take remaining space
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#2A2A2A',
        color: '#fff',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
    },
    sendButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
    },
    micButton: {
        backgroundColor: '#444',
        padding: 10,
        borderRadius: 25,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    micActive: {
        backgroundColor: '#EF4444',
    },
    micText: {
        fontSize: 20,
    },
    agentButton: {
        position: 'absolute',
        right: 10,
        backgroundColor: '#444',
        padding: 8,
        borderRadius: 12,
    },
    agentButtonActive: {
        backgroundColor: '#00ff9d',
    },
    agentButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    }
});

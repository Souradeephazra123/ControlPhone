import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import axios from 'axios';

// Replace with your actual server URL (10.0.2.2 for Android Emulator, or your local IP)
const SERVER_URL = 'http://192.168.1.5:3000/api'; // TEMP: Needs to be configured

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}

export default function AICreativeScreen() {
    const [messages, setMessages] = useState<Message[]>([]);
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

                const { recording } = await Audio.Recording.createAsync(
                    Audio.RecordingOptionsPresets.HIGH_QUALITY
                );
                setRecording(recording);
                setIsRecording(true);
            }
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    };

    const stopRecording = async () => {
        setRecording(null);
        setIsRecording(false);
        try {
            if (!recording) return;
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            console.log('Recording stored at', uri);
            // Here you would upload the audio to the server for transcription
            // For now, we'll just mock it or say "Audio recorded" because our backend is text-only for this step
            sendMessage("[Audio Recording Sent]");
        } catch (error) {
            console.error('Failed to stop recording', error);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>AI Creative</Text>
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
    }
});

import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient'; // Need to install if not present, or use simple View

// Assuming no linear-gradient installed yet, using standard Views and Styles
// "Unique image" - using a placeholder for now or abstract design

export default function HomeScreen({ navigation }: any) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Control your digital life</Text>
            </View>

            <View style={styles.cardContainer}>
                <TouchableOpacity
                    style={styles.card}
                    onPress={() => navigation.navigate('AI-Creative')}
                >
                    <ImageBackground
                        source={{ uri: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop' }}
                        style={styles.cardBackground}
                        imageStyle={{ borderRadius: 20, opacity: 0.7 }}
                    >
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>AI Assistant</Text>
                            <Text style={styles.cardDescription}>Voice-enabled creative companion</Text>
                        </View>
                    </ImageBackground>
                </TouchableOpacity>

                {/* Placeholder for other features */}
                <TouchableOpacity style={styles.card}>
                    <View style={[styles.cardBackground, { backgroundColor: '#333' }]}>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Stats</Text>
                            <Text style={styles.cardDescription}>View your usage analytics</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
    },
    cardContainer: {
        padding: 16,
        gap: 16,
    },
    card: {
        height: 180,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
    },
    cardBackground: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: 16,
        backgroundColor: '#2A2A2A',
        borderRadius: 20,
    },
    cardContent: {

    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    cardDescription: {
        fontSize: 14,
        color: '#ccc',
    },
});

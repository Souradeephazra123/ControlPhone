import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Platform,
  Image,
  Dimensions,
  Easing,
  Linking
} from 'react-native';

// Note: User didn't say to install new packages, so I'll try to stick to basic RN. 

// For the logo, we'll assume it's at ./assets/logo.png.
const LOGO_SOURCE = require('./assets/logo.png');

type Screen = 'loading' | 'home' | 'wifi' | 'scheduler';

const THEME = {
  primary: '#00f2ff', // Neon Cyan
  secondary: '#0044ff',
  background: '#0a0a12', // Deep Dark Blue
  card: '#161622',
  text: '#ffffff',
  textDim: '#8888aa',
  success: '#00ff9d',
  danger: '#ff0055',
  accent: '#7000ff'
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('loading');
  const [isWifiOn, setIsWifiOn] = useState(true);
  const [isAirplaneOn, setIsAirplaneOn] = useState(false);
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);
  const [offTime, setOffTime] = useState('22:00');

  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // --- Scheduler Logic ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (schedulerEnabled) {
      interval = setInterval(() => {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        if (currentTime === offTime && isWifiOn) {
          setIsWifiOn(false);
          Alert.alert(
            'Control Protocol',
            `Scheduled Time (${offTime}) Reached.\nExecuting WiFi Shutdown Sequence...`
          );
        }
      }, 5000); // Check every 5s for demo
    }
    return () => { if (interval) clearInterval(interval); };
  }, [schedulerEnabled, offTime, isWifiOn]);

  // --- Loading Sequence ---
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      })
    ]).start();

    const timer = setTimeout(() => {
      // Exit animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setCurrentScreen('home'));
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const toggleWifi = () => {
    // On iOS/Android, direct toggle is restricted.
    // We simulate the intent, then open settings for the user to confirm.
    Alert.alert(
      'System Security',
      'Direct WiFi control is restricted by OS security.\n\nOpening Settings allows you to manually control the connection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            Linking.openSettings();
            // Toggle state for simulation purposes
            setIsWifiOn(prev => !prev);
          }
        }
      ]
    );
  };

  const toggleAirplane = () => {
    Alert.alert(
      'System Security',
      'Airplane Mode is a protected system setting.\n\nOpening Settings allows you to manually toggle it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            // Android specific intent, fallback to general settings
            if (Platform.OS === 'android') {
              try { Linking.sendIntent("android.settings.AIRPLANE_MODE_SETTINGS"); }
              catch (e) { Linking.openSettings(); }
            } else {
              Linking.openSettings();
            }
            setIsAirplaneOn(prev => !prev);
          }
        }
      ]
    );
  };

  // --- Renderers ---

  const renderHeader = (title: string, showBack = false) => (
    <View style={styles.header}>
      {showBack ? (
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen('home')}>
          <Text style={styles.backButtonIcon}>{'‹'}</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 40 }} />}
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  if (currentScreen === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <Image source={LOGO_SOURCE} style={styles.logoLarge} resizeMode="contain" />
          <Text style={styles.loadingText}>CONTROL<Text style={{ color: THEME.primary }}>PHONE</Text></Text>
          <ActivityIndicator size="small" color={THEME.primary} style={{ marginTop: 20 }} />
        </Animated.View>
      </View>
    );
  }

  const renderHome = () => (
    <View style={styles.screenContainer}>
      <View style={styles.heroSection}>
        <Text style={styles.heroGreeting}>Welcome Back</Text>
        <Text style={styles.heroTitle}>System Status</Text>
        <View style={[styles.statusBadge, { borderColor: isWifiOn ? THEME.success : THEME.danger }]}>
          <View style={[styles.statusDot, { backgroundColor: isWifiOn ? THEME.success : THEME.danger }]} />
          <Text style={styles.statusText}>{isWifiOn ? 'ONLINE' : 'OFFLINE'}</Text>
        </View>
      </View>


      <View style={styles.gridContainer}>
        {/* WiFi Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => setCurrentScreen('wifi')}
        >
          <View style={[styles.cardIconBox, { backgroundColor: 'rgba(0, 242, 255, 0.15)' }]}>
            <Text style={{ fontSize: 24 }}>📶</Text>
          </View>
          <Text style={styles.cardTitle}>WiFi Control</Text>
          <Text style={styles.cardStatus}>{isWifiOn ? 'Create Connection' : 'Severed'}</Text>
        </TouchableOpacity>

        {/* Airplane Mode Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={toggleAirplane}
        >
          <View style={[styles.cardIconBox, { backgroundColor: 'rgba(255, 136, 0, 0.15)' }]}>
            <Text style={{ fontSize: 24 }}>✈️</Text>
          </View>
          <Text style={styles.cardTitle}>Airplane Mode</Text>
          <Text style={styles.cardStatus}>{isAirplaneOn ? 'Engaged' : 'Off'}</Text>
        </TouchableOpacity>

        {/* Scheduler Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => setCurrentScreen('scheduler')}
        >
          <View style={[styles.cardIconBox, { backgroundColor: 'rgba(112, 0, 255, 0.15)' }]}>
            <Text style={{ fontSize: 24 }}>⏰</Text>
          </View>
          <Text style={styles.cardTitle}>Auto-Scheduler</Text>
          <Text style={styles.cardStatus}>{schedulerEnabled ? offTime : 'Disabled'}</Text>
        </TouchableOpacity>
      </View>
    </View >
  );

  const renderWifi = () => (
    <View style={styles.screenContainer}>
      {renderHeader('Connection', true)}
      <View style={styles.centerContent}>
        <View style={[
          styles.ringContainer,
          { borderColor: isWifiOn ? THEME.primary : '#333', shadowColor: isWifiOn ? THEME.primary : '#000' }
        ]}>
          <TouchableOpacity onPress={toggleWifi} style={styles.powerButton}>
            <Text style={{ fontSize: 40, color: isWifiOn ? THEME.primary : '#444' }}>
              {isWifiOn ? '⦿' : '○'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.connectionState}>{isWifiOn ? 'CONNECTED' : 'DISCONNECTED'}</Text>
        <Text style={styles.connectionSubMsg}>
          {isWifiOn ? 'Safety protocols active. Traffic monitored.' : 'Device isolated from local networks.'}
        </Text>
      </View>
    </View>
  );

  const renderScheduler = () => (
    <View style={styles.screenContainer}>
      {renderHeader('Scheduler', true)}
      <View style={styles.contentPadding}>
        <View style={styles.glassCard}>
          <View style={styles.row}>
            <Text style={styles.cardTitle}>Enable Auto-Off</Text>
            <Switch
              trackColor={{ false: "#333", true: THEME.success }}
              thumbColor={"#fff"}
              onValueChange={setSchedulerEnabled}
              value={schedulerEnabled}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>Execution Time</Text>
          <TextInput
            style={styles.timeInput}
            value={offTime}
            onChangeText={setOffTime}
            placeholder="22:00"
            placeholderTextColor="#555"
            keyboardType="default"
            maxLength={5}
          />
          <Text style={styles.hint}>System clock: 24-hour format (HH:MM)</Text>
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={() => setCurrentScreen('home')}>
          <Text style={styles.btnText}>Save Configuration</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar style="light" />
      {currentScreen === 'home' && renderHome()}
      {currentScreen === 'wifi' && renderWifi()}
      {currentScreen === 'scheduler' && renderScheduler()}

      {/* Loading overlay handled by return earlier */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLarge: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '800',
    color: THEME.text,
    letterSpacing: 2,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: THEME.text,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  backButton: {
    padding: 10,
    marginLeft: -10,
  },
  backButtonIcon: {
    fontSize: 32,
    color: THEME.text,
    lineHeight: 32,
  },

  // Home
  screenContainer: {
    flex: 1,
  },
  heroSection: {
    padding: 30,
    paddingTop: 50,
  },
  heroGreeting: {
    color: THEME.textDim,
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  heroTitle: {
    color: THEME.text,
    fontSize: 34,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a24',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: 15,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: THEME.text,
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  card: {
    width: (SCREEN_WIDTH - 55) / 2, // 2 columns with padding
    // flex: 1, removed flex:1 to allow wrapping with fixed width
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    height: 180,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#222',
  },
  cardIconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: '600',
  },
  cardStatus: {
    color: THEME.textDim,
    fontSize: 13,
  },

  // Wifi Screen
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  ringContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  powerButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1a1a22',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  connectionState: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.text,
    letterSpacing: 2,
    marginBottom: 10,
  },
  connectionSubMsg: {
    fontSize: 14,
    color: THEME.textDim,
    textAlign: 'center',
    maxWidth: '70%',
  },

  // Scheduler Screen
  contentPadding: {
    padding: 20,
  },
  glassCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 30,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 20,
  },
  label: {
    color: THEME.textDim,
    fontSize: 14,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  timeInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: THEME.primary,
    textAlign: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  hint: {
    color: '#444',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  btnPrimary: {
    backgroundColor: THEME.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  btnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

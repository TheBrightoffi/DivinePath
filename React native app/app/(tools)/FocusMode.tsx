import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, AppState, Alert, Platform,StatusBar } from 'react-native';
import LottieView from 'lottie-react-native';
import plantGrowAnimation from '../../assets/a1bhCCFn6W.json';
import tw from 'twrnc';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('mainapp.db');

interface FocusSession {
  id: number;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'completed' | 'failed';
  date: string;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,  // Enable sound
    shouldSetBadge: false,
  }),
});

export default function FocusPlantApp() {
  const [minutes, setMinutes] = useState('1');
  const [seconds, setSeconds] = useState('0');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isFocusing, setIsFocusing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const animationRef = useRef<LottieView | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  const router = useRouter();

  // Request notification permissions
  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    };
    requestPermissions();
  }, []);

  useEffect(() => {
    // Create the focustime table if it doesn't exist
    const stmt = db.prepareSync(
      'CREATE TABLE IF NOT EXISTS focustime (id INTEGER PRIMARY KEY AUTOINCREMENT, startTime TEXT, endTime TEXT, duration INTEGER, status TEXT, date TEXT);'
    );
    try {
      stmt.executeSync();
      console.log('Table created successfully');
    } catch (error) {
      console.error('Error creating table:', error);
    } finally {
      stmt.finalizeSync();
    }
  }, []);

  const calculateTotalSeconds = () => {
    const min = parseInt(minutes) || 0;
    const sec = parseInt(seconds) || 0;
    return min * 60 + sec;
  };

  const handleStart = () => {
    const totalDuration = calculateTotalSeconds();
    if (totalDuration > 0) {
      const startTime = new Date().toISOString();
      setSessionStartTime(startTime);
      setTimeLeft(totalDuration);
      setIsFocusing(true);
      animationRef.current?.play();
    }
  };

  const saveSession = (status: 'completed' | 'failed') => {
    if (sessionStartTime) {
      const endTime = new Date().toISOString();
      const duration = calculateTotalSeconds() - timeLeft;
      const date = new Date().toISOString().split('T')[0];

      const stmt = db.prepareSync(
        'INSERT INTO focustime (startTime, endTime, duration, status, date) VALUES (?, ?, ?, ?, ?)'
      );
      try {
        stmt.executeSync([sessionStartTime, endTime, duration, status, date]);
        console.log('Session saved successfully');
      } catch (error) {
        console.error('Error saving session:', error);
      } finally {
        stmt.finalizeSync();
      }
    }
    setSessionStartTime(null);
  };

  const handleStop = () => {
    saveSession('failed');
    if (timerRef.current) {
      clearInterval(timerRef.current as NodeJS.Timeout);
      timerRef.current = null;
    }
    setIsFocusing(false);
    setTimeLeft(0);
    animationRef.current?.reset();

    // Trigger notification on stop with sound
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Focus Session Stopped',
        body: 'Oops, you lost focus — your little plant couldn’t survive. But don’t worry, you can always grow again. 🌿',
        sound: 'default', // Use default system notification sound
      },
      trigger: null,
    });
  };

  useEffect(() => {
    if (isFocusing && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isFocusing) {
      saveSession('completed');
      setIsFocusing(false);
      if (timerRef.current) {
        clearInterval(timerRef.current as NodeJS.Timeout);
        timerRef.current = null;
      }
      
      // Send completion notification with sound
      Notifications.scheduleNotificationAsync({
        content: {
          title: 'Focus Session Completed Shwets!',
          body: 'You stayed focused, and your growth is blooming — just like your dreams 🌱',
          sound: 'default', // Use default system notification sound
        },
        trigger: null,
      });

      // Alert.alert('Focus Session Complete', 'Your plant has fully grown! 🌱');
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current as NodeJS.Timeout);
        timerRef.current = null;
      }
    };
  }, [isFocusing, timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && isFocusing) {
      setIsFocusing(false);
      animationRef.current?.reset();
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 5000); // Hide after 5 seconds
    }
  }, [timeLeft]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState === 'background' && isFocusing) {
        saveSession('failed');
        Alert.alert('Focus Interrupted', 'You exited the app. your little plant couldn’t survive. 🌿');
        handleStop();

        // Trigger notification on app exit with sound
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'Focus Interrupted',
            body: 'You exited the app. your little plant couldn’t survive. 🌿',
            sound: 'default', // Use default system notification sound
          },
          trigger: null,
        });
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [isFocusing]);

  const displayTime = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}`;

  const handleViewHistory = () => {
    router.push('/(tools)/FocusHistory');
  };

  const validateAndSetMinutes = (value: string) => {
    const num = parseInt(value) || 0;
    if (num >= 0 && num <= 180) { // max 3 hours
      setMinutes(value);
    }
  };

  const validateAndSetSeconds = (value: string) => {
    const num = parseInt(value) || 0;
    if (num >= 0 && num < 60) {
      setSeconds(value);
    }
  };

  return (
    <View style={tw`flex-1 bg-white from-green-200 to-green-500 items-center justify-center p-5`}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <TouchableOpacity
        style={tw`absolute top-4 right-4 border border-slate-500 p-3 rounded-lg`}
        onPress={() => router.push('/(tools)/FocusHistory')}
      >
        <Text className="text-slate-500 font-semibold text-sm font-montserrat">View History</Text>
      </TouchableOpacity>

      <Text className="text-3xl color-slate-500 mb-2 font-montserrat-bold">Focus Plant</Text>
      <Text className="text-gray-700 text-center mb-4 font-montserrat">Set your focus time and watch your little plant bloom with you! 🌱</Text>

      <View className="w-60 h-60 bg-slate-100 rounded-full items-center justify-center mb-6">
        {isFocusing ? (
          <LottieView
            ref={animationRef}
            source={plantGrowAnimation}
            loop={false}
            autoPlay
            style={{ width: 180, height: 180 }}
            speed={1 / calculateTotalSeconds()}
          />
        ) : (
          <Text className="text-lg font-medium font-montserrat">{timeLeft > 0 ? 'Plant Dead 🌿' : 'Start'}</Text>
        )}
      </View>

      <Text className="text-7xl font-semibold mb-2 color-slate-500 font-montserrat-bold">{displayTime}</Text>

      {!isFocusing && (
        <View style={tw`flex-row gap-4 mb-15`}>
          <TextInput
            style={tw`border border-gray-300 rounded px-4 py-2 w-20 bg-white text-center shadow-md`}
            keyboardType='numeric'
            placeholder='Min'
            value={minutes}
            onChangeText={validateAndSetMinutes}
            maxLength={3}
          />
          <TextInput
            style={tw`border border-gray-300 rounded px-4 py-2 w-20 bg-white text-center shadow-md`}
            keyboardType='numeric'
            placeholder='Sec'
            value={seconds}
            onChangeText={validateAndSetSeconds}
            maxLength={2}
          />
        </View>
      )}

      {/* {isFocusing && (
        <View style={tw`w-full h-2 bg-gray-300 rounded-full overflow-hidden my-4`}>
          <View style={[tw`h-full bg-green-600`, { width: `${(timeLeft / calculateTotalSeconds()) * 100}%` }]} />
        </View>
      )} */}

      <View style={tw` w-full gap-4`}>
        {!isFocusing ? (
          <TouchableOpacity
            className="bg-gray-400 p-4 rounded-lg items-center"
            onPress={handleStart}
          >
            <Text className="text-white font-semibold text-base font-montserrat">Start</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="bg-gray-400 p-4 rounded-lg items-center"
            onPress={handleStop}
          >
            <Text className="text-white font-semibold text-base font-montserrat">Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      {showCelebration && (
        <View style={tw`absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 items-center justify-center`}>
          <View style={tw`bg-white rounded-lg p-6 items-center shadow-lg`}>
            <LottieView
              source={require('../../assets/a1bhCCFn6W.json')}
              autoPlay
              loop={false}
              style={{ width: 150, height: 150 }}
            />
            <Text className="text-xl  text-green-600 mt-4 font-montserrat">Congratulations Shweta!</Text>
            <Text className="text-gray-700 mt-2 font-montserrat">You successfully completed your focus session!</Text>
          </View>
        </View>
      )}
    </View>
  );
}

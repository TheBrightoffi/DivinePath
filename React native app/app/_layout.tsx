import { Stack } from "expo-router";
import "../global.css";
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
// import 'react-native-reanimated';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Montserrat': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.ttf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.ttf'),
    'Montserrat-Light': require('../assets/fonts/Montserrat-Light.ttf'),
    'Montserrat-Black': require('../assets/fonts/Montserrat-ExtraBold.ttf'),
  });

  useEffect(() => {
    const prepare = async () => {
      if (fontsLoaded || fontError) {
        await SplashScreen.hideAsync();
      }
    };
    prepare();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="LandingPage" options={{ headerShown: false }} />
      <Stack.Screen name="Home" options={{ headerShown: false }} />
      <Stack.Screen name="(tools)/FocusMode" options={{ headerShown: true, title: "Focus Mode", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/FocusHistory" options={{ headerShown: true, title: "Focus History", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/Createtasks" options={{ headerShown: true, title: "Tasks", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/CreateRoadmap" options={{ headerShown: true, title: "Roadmap", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/AddNote" options={{ headerShown: true, title: "Quick Notes", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/Habit" options={{ headerShown: true, title: "Habits", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/Remainder" options={{ headerShown: true, title: "Reminders", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/Flashcards" options={{ headerShown: true, title: "Flashcards", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/ChapterList" options={{ headerShown: true, title: "Chapters", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/SubjectsList" options={{ headerShown: true, title: "Subjects", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/FlashcardList" options={{ headerShown: true, title: "Flashcards", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/CreateManifest" options={{ headerShown: true, title: "Create Manifest", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/Manifest" options={{ headerShown: true, title: "Manifest", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/Settings" options={{ headerShown: true, title: "Settings", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/DailyNewsAi" options={{ headerShown: true, title: "Daily News AI", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/News" options={{ headerShown: false }} />
      <Stack.Screen name="(tools)/MCQ2" options={{ headerShown: false }} />
      <Stack.Screen name="(tools)/MCQ1" options={{ headerShown: true, title: "MCQ Practice", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/MCQHistory" options={{ headerShown: true, title: "MCQ History", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/SyllabusTracker" options={{ headerShown: true, title: "Syllabus Tracker", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tools)/Remainder_daywise" options={{ headerShown: true, title: "Day-wise Reminders", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/WhattoImprove" options={{ headerShown: true, title: "What To Improve", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/Database" options={{ headerShown: true, title: "Database", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />
      <Stack.Screen name="(tools)/MCQChapters" options={{ headerShown: true, title: "MCQ Chapters", headerTitleStyle: { fontFamily: 'Montserrat-Medium' } }} />

    </Stack>
  );
}

import React from 'react';
import { SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View, Modal, Animated, Dimensions } from "react-native"
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useState, useRef, useEffect } from "react"
import LottieView from 'lottie-react-native';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('mainapp.db');

interface TaskStatsRow {
  total: number;
  completed: number;
}

// Add interfaces for database results
interface CountResult {
  total: number;
}

interface DurationResult {
  total_duration: number;
}

interface ToolRoute {
  route: '/(tools)/Createtasks' | '/(tools)/FocusMode' | '/(tools)/CreateRoadmap' |
  '/(tools)/Habit' | '/(tools)/AddNote' | '/(tools)/Remainder' |
  '/(tools)/Manifest' | '/(tools)/CreateManifest' | '/(tools)/DailyNewsAi' |
  '/(tools)/OldPaper';
  icon: string;
  label: string;
  color: string;
}

export default function App() {
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  const isLargeScreen = screenWidth >= 1024;

  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);
  const [todaysFocusMinutes, setTodaysFocusMinutes] = useState(0);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, percentage: 0 });
  const [totalRoadmaps, setTotalRoadmaps] = useState(0);
  const [totalHabits, setTotalHabits] = useState(0);
  const [totalReminders, setTotalReminders] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);

  const [totalManifests, setTotalManifests] = useState(0);

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const { width } = Dimensions.get('window');

  const updateTaskStats = () => {
    const stmt = db.prepareSync('SELECT COUNT(*) as total, SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed FROM tasks');
    try {
      const results = stmt.executeSync();
      const row = results.getAllSync()[0] as TaskStatsRow;
      const percentage = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
      setTaskStats({ total: row.total, completed: row.completed, percentage });
    } catch (error) {
      console.error('Error calculating task stats:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const getRoadmapCount = () => {
    const stmt = db.prepareSync('SELECT COUNT(*) as total FROM roadmap');
    try {
      const result = stmt.executeSync();
      const row = result.getAllSync()[0] as CountResult;
      setTotalRoadmaps(row.total);
    } catch (error) {
      console.error('Error getting roadmap count:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const getHabitCount = () => {
    const stmt = db.prepareSync('SELECT COUNT(*) as total FROM habit');
    try {
      const result = stmt.executeSync();
      const row = result.getAllSync()[0] as CountResult;
      setTotalHabits(row.total);
    } catch (error) {
      console.error('Error getting habit count:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const getReminderCount = () => {
    const stmt = db.prepareSync('SELECT COUNT(*) as total FROM reminders');
    try {
      const result = stmt.executeSync();
      const row = result.getAllSync()[0] as CountResult;
      setTotalReminders(row.total);
    } catch (error) {
      console.error('Error getting reminder count:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const getManifestCount = () => {
    const stmt = db.prepareSync('SELECT COUNT(*) as total FROM manifest');
    try {
      const result = stmt.executeSync();
      const row = result.getAllSync()[0] as CountResult;
      setTotalManifests(row.total);
    } catch (error) {
      console.error('Error getting manifest count:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const getNotesCount = () => {
    const stmt = db.prepareSync('SELECT COUNT(*) as total FROM notes');
    try {
      const result = stmt.executeSync();
      const row = result.getAllSync()[0] as CountResult;
      setTotalNotes(row.total);
    } catch (error) {
      console.error('Error getting notes count:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const getTodaysFocusTime = () => {
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepareSync(
      'SELECT SUM(duration) as total_duration FROM focustime WHERE date = ? AND status = "completed"'
    );
    try {
      const results = stmt.executeSync([today]);
      const row = results.getAllSync()[0] as DurationResult;
      const todaySeconds = row.total_duration || 0;
      setTodaysFocusMinutes(Math.floor(todaySeconds / 60));
    } catch (error) {
      console.error('Error calculating today\'s focus time:', error);
      setTodaysFocusMinutes(0);
    } finally {
      stmt.finalizeSync();
    }
  };

  const getTotalFocusTime = () => {
    const stmt = db.prepareSync('SELECT SUM(duration) as total_duration FROM focustime WHERE status = "completed"');
    try {
      const results = stmt.executeSync();
      const row = results.getAllSync()[0] as DurationResult;
      const totalSeconds = row.total_duration || 0;
      setTotalFocusMinutes(Math.floor(totalSeconds / 60));
    } catch (error) {
      console.error('Error calculating total focus time:', error);
      setTotalFocusMinutes(0);
    } finally {
      stmt.finalizeSync();
    }
  };

  const refreshData = () => {
    updateTaskStats();
    getRoadmapCount();
    getHabitCount();
    getReminderCount();
    getManifestCount();
    getNotesCount();
    getTotalFocusTime();
    getTodaysFocusTime();
  };

  useEffect(() => {
    refreshData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      refreshData();
    }, [])
  );

  useEffect(() => {
    const scrollInterval = setInterval(() => {
      if (scrollViewRef.current) {
        const nextIndex = currentCardIndex === 0 ? 1 : 0;
        scrollViewRef.current.scrollTo({
          x: nextIndex * (width - 40), // 40 is the total horizontal padding (px-5)
          animated: true
        });
        setCurrentCardIndex(nextIndex);
      }
    }, 10000); // 10 seconds interval

    return () => clearInterval(scrollInterval);
  }, [currentCardIndex]);

  const showModal = () => {
    setModalVisible(true);
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const hideModal = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View className={`flex-row justify-between items-center ${isTablet ? 'px-6 pt-4 pb-4' : 'px-1 pt-2 pb-2'}`}>
        <View className="flex-row items-center">
          <View className="rounded-full mr-1 overflow-hidden items-center justify-center">
            <LottieView
              source={require('../assets/profile_lottie.json')}
              autoPlay
              loop
              style={{ height: isTablet ? 100 : 80, width: isTablet ? 100 : 80 }}
            />
          </View>
          <View>
            <Text className={`text-gray-500 ${isTablet ? 'text-sm' : 'text-xs'} font-montserrat`}>Welcome Back</Text>
            <Text className={`text-black font-semibold ${isTablet ? 'text-2xl' : 'text-lg'} font-montserrat-bold`}>Kairavi</Text>
          </View>
        </View>

        <TouchableOpacity 
          className={`${isTablet ? 'h-12 w-12' : 'h-9 w-9'} rounded-full ${isTablet ? 'mr-6' : 'mr-5'} bg-gray-100 items-center justify-center`}
          style={{ minWidth: isTablet ? 48 : 36, minHeight: isTablet ? 48 : 36 }}
        >
          <Icon name="bell" size={isTablet ? 24 : 18} color="#333" />
        </TouchableOpacity>
      </View>
      <Text className={`font-medium ${isTablet ? 'text-3xl ml-8' : 'text-xl ml-6'} font-montserrat-bold mb-2`}>Dashboard</Text>
      <ScrollView className={`flex-1 ${isTablet ? 'px-8' : 'px-5'}`}>
        {/* Task Cards ScrollView */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          ref={scrollViewRef}
          onMomentumScrollEnd={(event) => {
            const cardWidth = isTablet ? Math.min(screenWidth - 64, 600) : screenWidth - 40;
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
            setCurrentCardIndex(newIndex);
          }}
          style={{ width: isTablet ? Math.min(screenWidth - 64, 600) : screenWidth - 40 }}
        >
          {/* Task Card */}
          <View 
            style={{ width: isTablet ? Math.min(screenWidth - 64, 600) : screenWidth - 40 }} 
            className="rounded-3xl overflow-hidden mb-6"
          >
            <LinearGradient
              colors={['#624E88', '#8967B3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className={`${isTablet ? 'p-8' : 'p-5'}`}>
              <View className="flex-row justify-between items-center">
                <View className="w-3/5">
                  <Text className={`text-white ${isTablet ? 'text-2xl' : 'text-xl'} mb-1 font-montserrat-bold`}>Tasks</Text>
                  {taskStats.percentage < 20 && (
                    <Text className={`text-white/80 ${isTablet ? 'text-sm' : 'text-xs'} font-montserrat`}>You can do it ({taskStats.completed}/{taskStats.total})</Text>
                  )}
                  {taskStats.percentage === 50 && (
                    <Text className={`text-white/80 ${isTablet ? 'text-sm' : 'text-xs'} font-montserrat`}>You Have completed half of your Tasks ({taskStats.completed}/{taskStats.total})</Text>
                  )}
                  {taskStats.percentage > 75 && taskStats.percentage < 100 && (
                    <Text className={`text-white/80 ${isTablet ? 'text-sm' : 'text-xs'} font-montserrat`}>Almost There ({taskStats.completed}/{taskStats.total})</Text>
                  )}
                  {taskStats.percentage === 100 && (
                    <Text className={`text-white/80 ${isTablet ? 'text-sm' : 'text-xs'} font-montserrat`}>Completed Task({taskStats.completed}/{taskStats.total})</Text>
                  )}
                  <TouchableOpacity
                    className={`bg-white/20 rounded-full ${isTablet ? 'px-6 py-3 mt-4 w-36' : 'px-4 py-2 mt-3 w-28'}`}
                    onPress={() => router.push('/(tools)/Createtasks')}
                    style={{ minHeight: isTablet ? 44 : 32 }}
                  >
                    <Text className={`text-white text-center ${isTablet ? 'text-sm' : 'text-xs'} font-medium font-montserrat`}>View Task</Text>
                  </TouchableOpacity>
                </View>
                <View className="items-center justify-center">
                  <View className="h-22 w-22 rounded-full items-center justify-center">
                    <View
                      className="absolute h-full w-full"
                      style={{
                        borderWidth: 4,
                        borderColor: 'white',
                        borderRadius: 42,
                        borderLeftColor: 'transparent',
                        borderBottomColor: 'transparent',
                        transform: [{ rotate: `${(taskStats.percentage / 100) * 360 - 90}deg` }],
                      }}
                    />
                    <Text className={`text-white ${isTablet ? 'text-2xl' : 'text-xl'} font-montserrat-bold`}>{taskStats.percentage}%</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* MCQ Card */}
          <View 
            style={{ width: isTablet ? Math.min(screenWidth - 64, 600) : screenWidth - 40 }} 
            className="rounded-3xl overflow-hidden mb-6"
          >
            <LinearGradient
              colors={['#624E88', '#8967B3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className={`${isTablet ? 'p-8' : 'p-5'}`}>
              <View className="flex-row justify-between items-center">
                <View className="w-5/5">
                  <Text className={`text-white ${isTablet ? 'text-2xl' : 'text-xl'} font-medium mb-1 font-montserrat-bold`}>Daily MCQ's Test</Text>
                  <Text className={`text-white/80 ${isTablet ? 'text-sm' : 'text-xs'} font-montserrat`}>"Every MCQ you solve is a step closer to mastering the UPSC battlefield."</Text>
                  <TouchableOpacity
                    className={`bg-white/20 rounded-full ${isTablet ? 'px-6 py-3 mt-4 w-32' : 'px-4 py-2 mt-3 w-28'}`}
                    onPress={() => router.push('/(tools)/MCQ1')}
                    style={{ minHeight: isTablet ? 44 : 32 }}
                  >
                    <Text className={`text-white text-center ${isTablet ? 'text-sm' : 'text-xs'} font-medium font-montserrat`}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Pagination Dots */}
        <View className="flex-row justify-center items-center mb-6">
          <View
            className={`h-2 w-2 rounded-full mx-1 ${currentCardIndex === 0 ? 'bg-violet-600' : 'bg-gray-300'}`}
          />
          <View
            className={`h-2 w-2 rounded-full mx-1 ${currentCardIndex === 1 ? 'bg-violet-600' : 'bg-gray-300'}`}
          />
        </View>
        <Text 
          style={{ fontStyle: 'italic' }} 
          className={`text-gray-400 bg-slate-50 p-1 rounded-md ${isTablet ? 'text-sm' : 'text-xs'} text-center font-montserrat mb-5`}
        >
          "This isn't just preparation — this is divine alignment with your purpose."
        </Text>

        {/* Today's Focus Card */}
        <View className={`flex-row ${isTablet ? 'gap-6' : 'gap-4'}`}>
          <View className="flex-1 rounded-2xl overflow-hidden">
            <LinearGradient
              colors={['#EEEEEE', '#E5E1DA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className={`flex-row items-center ${isTablet ? 'p-6' : 'p-4'}`}>
              <View className="flex-1 mr-2">
                <Text className={`text-slate-700/80 ${isTablet ? 'text-xl' : 'text-1xl'} mb-1 font-montserrat-bold`}>Focus Time</Text>
                <Text className={`text-slate-700 ${isTablet ? 'text-lg' : 'text-1xl'} font-medium mb-3 font-montserrat`}>{todaysFocusMinutes} minutes today</Text>
                <View className="h-1.5 bg-white/20 rounded-full w-full">
                  <View
                    className="h-1.5 bg-slate-500 rounded-full absolute"
                    style={{
                      width: `${Math.min((todaysFocusMinutes / 5) * 100, 100)}%`
                    }}
                  />
                </View>
              </View>
              <View className={`${isTablet ? 'w-32 h-32' : 'w-24 h-24'} justify-center items-center opacity-20`}>
                <LottieView
                  source={require('../assets/universe_lottie.json')}
                  autoPlay
                  loop
                  style={{ width: '100%', height: '100%' }}
                />
              </View>
            </View>
          </View>
        </View>


        {/* In Progress Section */}
        {/* <View className="mb-6 mt-5">
          <View className="flex-row justify-between items-center mb-4">
          <Text className="text-black font-montserrat-bold text-lg">In Progress</Text>
            
            <Text className="text-violet-600 font-medium text-xs">2</Text>
          </View>

          <View className="flex-row gap-4">
           
            <View className="flex-1 bg-gray-50 rounded-2xl p-4">
              <View className="h-6 w-6 bg-pink-200 rounded-md items-center justify-center mb-2">
                <Text className="text-pink-600 text-xs">📊</Text>
              </View>
              <Text className="text-gray-400 text-xs mb-1 font-montserrat" >Habits</Text>
              <Text className="text-black font-medium text-sm mb-3 font-montserrat">Grocery shopping app design</Text>
              <View className="h-1.5 bg-gray-200 rounded-full w-full">
                <View className="h-1.5 bg-blue-500 rounded-full w-3/5" />
              </View>
            </View>

          
            <View className="flex-1 bg-gray-50 rounded-2xl p-4">
              <View className="h-6 w-6 bg-orange-200 rounded-md items-center justify-center mb-2">
                <Text className="text-orange-600 text-xs font-montserrat">🍔</Text>
              </View>
              <Text className="text-gray-400 text-xs mb-1 font-montserrat">Personal Project</Text>
              <Text className="text-black font-medium text-sm mb-3 font-montserrat">Uber Eats redesign challenge</Text>
              <View className="h-1.5 bg-gray-200 rounded-full w-full">
                <View className="h-1.5 bg-orange-400 rounded-full w-2/5" />
              </View>
            </View>
          </View>
        </View> */}

        {/* Task Groups */}

        <View className="mb-6 mt-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className={`text-black font-montserrat-bold ${isTablet ? 'text-2xl' : 'text-xl'}`}>Productivity Groups</Text>
            <Text className={`text-violet-600 font-montserrat ${isTablet ? 'text-sm' : 'text-xs'}`}>6</Text>
          </View>

          {/* Group 1 */}
          <View className={`${isTablet ? 'h-32' : 'h-24'} rounded-2xl mb-3 overflow-hidden`}>
            <LinearGradient
              colors={['#EEEEEE', '#E5E1DA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className={`flex-1 ${isTablet ? 'p-6' : 'p-4'} flex-row items-center justify-between`}>
              <View className="flex-1">
                <Text className={`text-slate-600 font-montserrat-bold ${isTablet ? 'text-xl' : 'text-lg'} mb-1`}>Total Tasks</Text>
                <Text className={`text-slate-500/80 font-montserrat ${isTablet ? 'text-base' : 'text-sm'}`}>{taskStats.total} Active Tasks</Text>
                <View className="flex-row items-center mt-1">
                  <View className="h-2 w-24 bg-slate-500/20 rounded-full mr-2">
                    <View
                      className="h-full bg-slate-500 rounded-full"
                      style={{ width: `${taskStats.percentage}%` }}
                    />
                  </View>
                  <Text className="text-slate-500 font-montserrat-bold text-xs">{taskStats.percentage}%</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tools)/Createtasks')}
                className={`bg-white/20 ${isTablet ? 'px-6 py-3' : 'px-4 py-2'} rounded-xl`}
                style={{ minHeight: isTablet ? 44 : 32 }}
              >
                <Text className={`text-slate-500 font-montserrat-bold ${isTablet ? 'text-base' : 'text-sm'}`}>View</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Group 2 */}
          <View className="h-24 rounded-2xl mb-3 overflow-hidden">
            <LinearGradient
              colors={['#EEEEEE', '#E5E1DA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className="flex-1 p-4 flex-row items-center">

              <View className="flex-1">
                <Text className="text-slate-600 font-montserrat-bold text-lg">Total Roadmaps</Text>
                <Text className="text-slate-500/80 font-montserrat text-sm">{totalRoadmaps} Active Roadmaps</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tools)/CreateRoadmap')}
                className="bg-white/20 px-4 py-2 rounded-xl"
              >
                <Text className="text-slate-500 font-montserrat-bold">View</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Group 3 */}
          <View className="h-24 rounded-2xl mb-3 overflow-hidden">
            <LinearGradient
               colors={['#EEEEEE', '#E5E1DA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className="flex-1 p-4 flex-row items-center">

              <View className="flex-1">
                <Text className="text-slate-600 font-montserrat-bold text-lg">Total Habits</Text>
                <Text className="text-slate-500/80 font-montserrat text-sm">{totalHabits} Active Habits</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tools)/Habit')}
                className="bg-white/20 px-4 py-2 rounded-xl"
              >
                <Text className="text-slate-500 font-montserrat-bold">View</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Group 4 */}
          <View className="h-24 rounded-2xl mb-3 overflow-hidden">
            <LinearGradient
              colors={['#EEEEEE', '#E5E1DA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className="flex-1 p-4 flex-row items-center">

              <View className="flex-1">
                <Text className="text-slate-600 font-montserrat-bold text-lg">Total Reminders</Text>
                <Text className="text-slate-500/80 font-montserrat text-sm">{totalReminders} Active Reminders</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tools)/Remainder')}
                className="bg-white/20 px-4 py-2 rounded-xl"
              >
                <Text className="text-slate-500 font-montserrat-bold">View</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Group 5 */}
          <View className="h-24 rounded-2xl mb-3 overflow-hidden">
            <LinearGradient
              colors={['#EEEEEE', '#E5E1DA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className="flex-1 p-4 flex-row items-center">

              <View className="flex-1">
                <Text className="text-slate-600 font-montserrat-bold text-lg">Total Manifests</Text>
                <Text className="text-slate-500/80 font-montserrat text-sm">{totalManifests} Active Manifests</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tools)/Manifest')}
                className="bg-white/20 px-4 py-2 rounded-xl"
              >
                <Text className="text-slate-500 font-montserrat-bold">View</Text>
              </TouchableOpacity>
            </View>
          </View>


          {/* Group 6 */}
          <View className="h-24 rounded-2xl mb-3 overflow-hidden">
            <LinearGradient
              colors={['#EEEEEE', '#E5E1DA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View className="flex-1 p-4 flex-row items-center">

              <View className="flex-1">
                <Text className="text-slate-600 font-montserrat-bold text-lg">Total Notes</Text>
                <Text className="text-slate-500/80 font-montserrat text-sm">{totalNotes} Notes Created</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tools)/AddNote')}
                className="bg-white/20 px-4 py-2 rounded-xl"
              >
                <Text className="text-slate-500 font-montserrat-bold">View</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="h-16 flex-row items-center justify-around border-t border-gray-100">
        <TouchableOpacity
          onPress={() => router.push('/(tools)/SubjectsList')}>
          <View className="items-center">
            {/* <MaterialIcon name="dashboard" size={20} color="#9ca3af" /> */}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-violet-600 h-12 w-12 rounded-full items-center justify-center -mt-6 shadow-lg"
          onPress={showModal}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(tools)/MCQ1')}
        >
          <View className="items-center">
            {/* <Icon name="file-document" size={20} color="#9ca3af" /> */}
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={hideModal}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl w-full p-6">
            <View className="w-16 h-1 bg-gray-200 rounded-full mx-auto mb-6" />


            {/* <Text style={{ fontStyle: 'italic' }} className="text-gray-500 bg-slate-100 p-2 rounded-md text-xs mb-6 font-montserrat">"You are not just preparing for UPSC, you're preparing to meet the version of you the universe already respects."</Text> */}
            {/* <Text className="text-black font-semibold text-lg mb-2 font-montserrat">Select a Tool</Text> */}
            <View className="flex-row flex-wrap justify-between gap-y-4">
              {([
                { icon: <Icon name="check-circle" size={30} color="#393E46" />, label: "New Task", color: "bg-pink-100", route: "/(tools)/Createtasks" },
                { icon: <Icon name="focus-auto" size={30} color="#393E46" />, label: "Focus Mode", color: "bg-purple-100", route: "/(tools)/FocusMode" },
                { icon: <Icon name="map-marker-path" size={30} color="#393E46" />, label: "Roadmap", color: "bg-blue-100", route: "/(tools)/CreateRoadmap" },
                { icon: <Icon name="target" size={30} color="#393E46" />, label: "Habit Tracker", color: "bg-green-100", route: "/(tools)/Habit" },
                { icon: <Icon name="bell-ring" size={30} color="#393E46" />, label: "Remainders", color: "bg-yellow-100", route: "/(tools)/Remainder" },
                { icon: <Icon name="text-box-check" size={30} color="#393E46" />, label: "Manifest", color: "bg-purple-100", route: "/(tools)/Manifest" },
                { icon: <Icon name="pencil-plus" size={30} color="#393E46" />, label: "Create Manifest", color: "bg-yellow-100", route: "/(tools)/CreateManifest" },
                { icon: <Icon name="notebook" size={30} color="#393E46" />, label: "Quick Note", color: "bg-orange-100", route: "/(tools)/AddNote" },
                { icon: <Icon name="cog" size={30} color="#393E46" />, label: "Settings", color: "bg-yellow-100", route: "/(tools)/Settings" },
                { icon: <Icon name="calendar-clock" size={30} color="#393E46" />, label: "Remainder By Days", color: "bg-pink-100", route: "/(tools)/Remainder_daywise" },
                { icon: <Icon name="format-list-checks" size={30} color="#393E46" />, label: "PY MCQ's", color: "bg-orange-100", route: "/(tools)/MCQ1" },
                { icon: <Icon name="clipboard-list" size={30} color="#393E46" />, label: "Syllabus Tracker", color: "bg-orange-100", route: "/(tools)/SyllabusTracker" },
                { icon: <Icon name="cards" size={30} color="#393E46" />, label: "Subjects Flashcards", color: "bg-orange-100", route: "/(tools)/SubjectsList" },
                { icon: <Icon name="newspaper-variant" size={30} color="#393E46" />, label: "The Daily Affair", color: "bg-purple-100", route: "/(tools)/DailyNewsAi" },
                { icon: <Icon name="newspaper" size={30} color="#393E46" />, label: "The Hindu", color: "bg-yellow-100", route: "/(tools)/News" },
                { icon: <Icon name="file-document" size={30} color="#393E46" />, label: "Old Papers Mains", color: "bg-orange-100", route: "/(tools)/OldPaper" },
              ] as ToolRoute[]).map((item, index) => (
                <TouchableOpacity
                  key={index}
                  className="w-[30%] items-center"
                  onPress={() => {
                    hideModal();
                    if (item.route) {
                      router.push(item.route);
                    }
                  }}
                >
                  <View className={`h-14 w-14 rounded-full ${item.color} items-center justify-center mb-2`}>
                    {typeof item.icon === "string" ? (
                      <Text className="text-2xl">{item.icon}</Text>
                    ) : (
                      item.icon
                    )}
                  </View>
                  <Text className="text-gray-600 text-xs font-montserrat">{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

   </SafeAreaView>
  )
}

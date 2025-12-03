import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StatusBar } from 'react-native';
import tw from 'twrnc';
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

interface TimeStats {
  totalTime: number;
  completedSessions: number;
}

export default function FocusHistory() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [weekStats, setWeekStats] = useState<TimeStats>({ totalTime: 0, completedSessions: 0 });
  const [monthStats, setMonthStats] = useState<TimeStats>({ totalTime: 0, completedSessions: 0 });
  const [yearStats, setYearStats] = useState<TimeStats>({ totalTime: 0, completedSessions: 0 });

  const calculateStats = (sessions: FocusSession[]) => {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const weekSessions = sessions.filter(session => new Date(session.date) >= weekStart);
    const monthSessions = sessions.filter(session => new Date(session.date) >= monthStart);
    const yearSessions = sessions.filter(session => new Date(session.date) >= yearStart);

    setWeekStats({
      totalTime: weekSessions.reduce((sum, session) => sum + session.duration, 0),
      completedSessions: weekSessions.filter(session => session.status === 'completed').length
    });

    setMonthStats({
      totalTime: monthSessions.reduce((sum, session) => sum + session.duration, 0),
      completedSessions: monthSessions.filter(session => session.status === 'completed').length
    });

    setYearStats({
      totalTime: yearSessions.reduce((sum, session) => sum + session.duration, 0),
      completedSessions: yearSessions.filter(session => session.status === 'completed').length
    });
  };

  const loadSessions = () => {
    const stmt = db.prepareSync('SELECT * FROM focustime ORDER BY date DESC, startTime DESC');
    try {
      const results = stmt.executeSync<FocusSession>();
      const rows = results.getAllSync();
      setSessions(rows);
      calculateStats(rows);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const deleteSession = (id: number) => {
    Alert.alert(
      "Delete Session",
      "Are you sure you want to delete this focus session?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const stmt = db.prepareSync('DELETE FROM focustime WHERE id = ?');
            try {
              stmt.executeSync([id]);
              console.log('Session deleted:', id);
              loadSessions();
            } catch (error) {
              console.error('Error deleting session:', error);
            } finally {
              stmt.finalizeSync();
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDurationHours = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString();
  };

  return (
    <View style={tw`flex-1 bg-gray-100 p-4`}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* <Text className="text-2xl font-bold mb-4 font-montserrat">Focus History</Text> */}
      
      {/* Stats Cards */}
      <View style={tw`flex-row justify-between mb-6`}>
        {/* This Week Card */}
        <View style={tw`bg-white rounded-xl p-4 shadow-md w-[31%]`}>
          <Text className="text-sm font-montserrat text-gray-500">This Week</Text>
          <Text className="text-lg font-bold font-montserrat mt-1">{formatDurationHours(weekStats.totalTime)}</Text>
          <Text className="text-xs font-montserrat text-gray-400 mt-1">{weekStats.completedSessions} sessions</Text>
        </View>

        {/* This Month Card */}
        <View style={tw`bg-white rounded-xl p-4 shadow-md w-[31%]`}>
          <Text className="text-sm font-montserrat text-gray-500">This Month</Text>
          <Text className="text-lg font-bold font-montserrat mt-1">{formatDurationHours(monthStats.totalTime)}</Text>
          <Text className="text-xs font-montserrat text-gray-400 mt-1">{monthStats.completedSessions} sessions</Text>
        </View>

        {/* This Year Card */}
        <View style={tw`bg-white rounded-xl p-4 shadow-md w-[31%]`}>
          <Text className="text-sm font-montserrat text-gray-500">This Year</Text>
          <Text className="text-lg font-bold font-montserrat mt-1">{formatDurationHours(yearStats.totalTime)}</Text>
          <Text className="text-xs font-montserrat text-gray-400 mt-1">{yearStats.completedSessions} sessions</Text>
        </View>
      </View>

      {/* Existing FlatList */}
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={tw`bg-white rounded-lg p-4 mb-3 shadow-sm`}>
            <View style={tw`flex-row justify-between items-center`}>
              <View>
                <Text className="text-lg font-semibold font-montserrat">{formatDate(item.date)}</Text>
                <Text className="text-gray-600 font-montserrat">
                  {formatTime(item.startTime)} - {formatTime(item.endTime)}
                </Text>
                <Text className="text-gray-600 font-montserrat">
                  Duration: {formatDuration(item.duration)}
                </Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <View style={[
                  tw`px-3 py-1 rounded-full mr-2`,
                  item.status === 'completed' ? tw`bg-green-200` : tw`bg-red-200`
                ]}>
                  <Text className={`font-medium font-montserrat ${
                    item.status === 'completed' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {item.status}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteSession(item.id)}
                  style={tw`bg-red-500 p-2 rounded-full`}
                >
                  <Text className="text-white text-xs font-montserrat">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}
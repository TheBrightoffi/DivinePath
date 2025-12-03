import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, StyleSheet, Alert ,StatusBar} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as SQLite from 'expo-sqlite';

interface SQLiteRow {
  id: string;
  name: string;
  description: string | null;
  currentStreak: number;
  highestStreak: number;
  completedDates: string | null;
  created_at: string;
}

interface Habit {
  id: string;
  name: string;
  description?: string;
  currentStreak: number;
  highestStreak: number;
  completedDates: string[];
  createdAt: string;
}

const db = SQLite.openDatabaseSync('mainapp.db');

const initializeDatabase = () => {
  const stmt = db.prepareSync(`
    CREATE TABLE IF NOT EXISTS habit (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      currentStreak INTEGER DEFAULT 0,
      highestStreak INTEGER DEFAULT 0,
      completedDates TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  try {
    stmt.executeSync();
  } catch (error) {
    console.error('Error creating habit table:', error);
  } finally {
    stmt.finalizeSync();
  }
};

export default function HabitScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitName, setHabitName] = useState('');
  const [habitDescription, setHabitDescription] = useState('');

  useEffect(() => {
    initializeDatabase();
    loadHabits();
  }, []);

  const loadHabits = () => {
    const stmt = db.prepareSync('SELECT * FROM habit');
    try {
      const results = stmt.executeSync<SQLiteRow>();
      const rows = results.getAllSync() as SQLiteRow[];
      const formattedHabits: Habit[] = rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        currentStreak: row.currentStreak,
        highestStreak: row.highestStreak,
        completedDates: row.completedDates ? row.completedDates.split(',').filter(Boolean) : [],
        createdAt: row.created_at
      }));
      setHabits(formattedHabits);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleSaveHabit = () => {
    if (habitName.trim()) {
      if (editingHabit) {
        const stmt = db.prepareSync('UPDATE habit SET name = ?, description = ? WHERE id = ?');
        try {
          stmt.executeSync([habitName, habitDescription, editingHabit.id]);
          loadHabits();
        } catch (error) {
          console.error('Error updating habit:', error);
        } finally {
          stmt.finalizeSync();
        }
      } else {
        const habitId = Math.random().toString(36).slice(2);
        const stmt = db.prepareSync('INSERT INTO habit (id, name, description) VALUES (?, ?, ?)');
        try {
          stmt.executeSync([habitId, habitName, habitDescription]);
          loadHabits();
        } catch (error) {
          console.error('Error creating habit:', error);
        } finally {
          stmt.finalizeSync();
        }
      }
      setModalVisible(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setHabitName('');
    setHabitDescription('');
    setEditingHabit(null);
  };

  const handleEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setHabitName(habit.name);
    setHabitDescription(habit.description || '');
    setModalVisible(true);
  };

  const toggleHabitCompletion = (habitId: string, date: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const completedDates = [...habit.completedDates];
    const dateIndex = completedDates.indexOf(date);

    if (dateIndex === -1) {
      completedDates.push(date);
    } else {
      completedDates.splice(dateIndex, 1);
    }

    // Calculate streaks
    const sortedDates = completedDates.sort();
    let currentStreak = 0;
    let highestStreak = habit.highestStreak;

    // Calculate current streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (completedDates.includes(today)) {
      currentStreak = 1;
      // Check previous days
      let checkDate = yesterday;
      let checking = true;

      while (checking) {
        const checkDateStr = checkDate.toISOString().split('T')[0];
        if (completedDates.includes(checkDateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          checking = false;
        }
      }
    }

    highestStreak = Math.max(currentStreak, highestStreak);

    const stmt = db.prepareSync('UPDATE habit SET completedDates = ?, currentStreak = ?, highestStreak = ? WHERE id = ?');
    try {
      stmt.executeSync([completedDates.join(','), currentStreak, highestStreak, habitId]);
      loadHabits();
    } catch (error) {
      console.error('Error updating habit completion:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const deleteHabit = (habitId: string) => {
    // Show confirmation alert
    Alert.alert(
      "Delete Habit",
      "Are you sure you want to delete this habit? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const stmt = db.prepareSync('DELETE FROM habit WHERE id = ?');
            try {
              stmt.executeSync([habitId]);
              loadHabits();
            } catch (error) {
              console.error('Error deleting habit:', error);
            } finally {
              stmt.finalizeSync();
            }
          }
        }
      ]
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <View className="flex-1 bg-gray-50 px-4 pt-6">
       <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="px-6 py-4 bg-slate-100 rounded-md mb-5 border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl text-gray-800 font-montserrat-bold">Habits</Text>
          <Text className="text-sm text-gray-500 mt-1 font-montserrat">Track your daily progress</Text>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
          className="bg-blue-600 rounded-full w-12 h-12 items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Text className="text-white text-2xl font-montserrat">+</Text>
        </TouchableOpacity>
      </View>



      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {habits.map(habit => (
          <View key={habit.id} className="bg-white mb-4 rounded-xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="text-lg font-montserrat-bold text-gray-800">{habit.name}</Text>
                {habit.description && (
                  <Text className="text-gray-500 font-montserrat-light mt-1">{habit.description}</Text>
                )}
              </View>
              <View className="flex-row items-center bg-indigo-50 px-3 py-1 rounded-full">
                <MaterialIcons name="local-fire-department" size={16} color="#4F46E5" />
                <Text className="ml-1 font-montserrat text-indigo-600">
                  {habit.currentStreak} | Best: {habit.highestStreak}
                </Text>
              </View>
            </View>

            <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => toggleHabitCompletion(habit.id, today)}
              >
                <MaterialIcons
                  name={habit.completedDates.includes(today) ? "check-circle" : "radio-button-unchecked"}
                  size={24}
                  color={habit.completedDates.includes(today) ? "#16A34A" : "#9CA3AF"}
                />
                <Text className={`ml-2 font-montserrat ${habit.completedDates.includes(today) ? 'text-green-600' : 'text-gray-500'}`}>
                  {habit.completedDates.includes(today) ? 'Completed' : 'Mark as done'}
                </Text>
              </TouchableOpacity>

              <View className="flex-row space-x-4">
                <TouchableOpacity
                  className="p-2"
                  onPress={() => handleEdit(habit)}
                >
                  <MaterialIcons name="edit" size={20} color="#4F46E5" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="p-2"
                  onPress={() => deleteHabit(habit.id)}
                >
                  <MaterialIcons name="delete" size={20} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View className="flex-1 justify-center bg-black/50 px-4">
          <View className="bg-white rounded-2xl p-6">
            <Text className="text-2xl font-montserrat-bold text-gray-800 mb-4">
              {editingHabit ? 'Edit Habit' : 'New Habit'}
            </Text>

            <TextInput
              className="w-full bg-gray-50 rounded-lg px-4 py-3 mb-4 font-montserrat text-gray-800 border border-gray-200"
              placeholder="Habit name"
              value={habitName}
              onChangeText={setHabitName}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              className="w-full bg-gray-50 rounded-lg px-4 py-3 mb-6 font-montserrat text-gray-800 border border-gray-200"
              placeholder="Description (optional)"
              value={habitDescription}
              onChangeText={setHabitDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
            />

            <View className="flex-row justify-end space-x-3">
              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-gray-200"
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text className="font-montserrat text-gray-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-indigo-600"
                onPress={handleSaveHabit}
              >
                <Text className="font-montserrat text-white">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
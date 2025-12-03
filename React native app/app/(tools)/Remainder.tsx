import { Text, View, TouchableOpacity, Modal, TextInput, ScrollView, Platform, Alert,StatusBar } from 'react-native'
import React, { useState, useEffect } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as Notifications from 'expo-notifications'
import * as SQLite from 'expo-sqlite';
import { TimeIntervalTriggerInput, DateTriggerInput, SchedulableTriggerInputTypes } from 'expo-notifications';

interface Reminder {
  id: string;
  name: string;
  frequency: 'hourly' | 'minute' | 'daily' | 'weekly';
  time: Date;
  weekDay: number | undefined; // 0-6, where 0 is Sunday
}

interface ReminderRow {
  id: string;
  name: string;
  frequency: 'hourly' | 'minute' | 'daily' | 'weekly';
  time: string;
  weekDay: number | null;
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const db = SQLite.openDatabaseSync('mainapp.db');
const intervalMap = new Map<string, number>();

export default function Remainder() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [reminderName, setReminderName] = useState('');
  const [frequency, setFrequency] = useState<'hourly' | 'minute' | 'daily' | 'weekly'>('daily');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedWeekDay, setSelectedWeekDay] = useState(0);

  useEffect(() => {
    const initializeReminders = async () => {
      // First create table if not exists
      const createTable = () => {
        const stmt = db.prepareSync(
          'CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, name TEXT, frequency TEXT, time TEXT, weekDay INTEGER);'
        );
        try {
          stmt.executeSync();
          console.log('Reminders table created successfully');
        } catch (error) {
          console.error('Error creating reminders table:', error);
        } finally {
          stmt.finalizeSync();
        }
      };

      try {
        createTable();
        
        // Ensure notifications are permitted
        await registerForPushNotificationsAsync();
        
        // Cancel all existing notifications to avoid duplicates
        await Notifications.cancelAllScheduledNotificationsAsync();
        
        // Load reminders from database
        const stmt = db.prepareSync('SELECT * FROM reminders;');
        const results = stmt.executeSync<any>();
        const rows = results.getAllSync();
        stmt.finalizeSync();
        
        // Format and store reminders
        const formattedReminders: Reminder[] = rows.map(row => ({
          id: row.id,
          name: row.name,
          frequency: row.frequency,
          time: new Date(row.time),
          weekDay: row.weekDay !== null ? row.weekDay : undefined
        }));
        setReminders(formattedReminders);
        
        // Reschedule all notifications
        for (const reminder of formattedReminders) {
          await scheduleNotification(reminder);
        }
        
        console.log('Successfully rescheduled all reminders');
      } catch (error) {
        console.error('Error initializing reminders:', error);
      }
    };

    initializeReminders();
  }, []);

  useEffect(() => {
    return () => {
      for (const [id, intervalId] of intervalMap) {
        clearInterval(intervalId);
      }
      intervalMap.clear();
    };
  }, []);

  const loadReminders = () => {
    const stmt = db.prepareSync('SELECT * FROM reminders ORDER BY time DESC;');
    try {
      const results = stmt.executeSync();
      if (!results) {
        console.error('No results returned from database');
        return;
      }
      
      const rows = results.getAllSync();
      console.log('Loaded reminders from DB:', rows);
      
      const formattedReminders: Reminder[] = rows.map((row: unknown) => {
        const reminderRow = row as ReminderRow;
        console.log('Processing row:', reminderRow);
        return {
          id: reminderRow.id,
          name: reminderRow.name,
          frequency: reminderRow.frequency,
          time: new Date(reminderRow.time),
          weekDay: reminderRow.weekDay !== null ? Number(reminderRow.weekDay) : undefined
        };
      });
      
      console.log('Formatted reminders:', formattedReminders);
      setReminders(formattedReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const registerForPushNotificationsAsync = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      alert('Please enable notifications to use reminders!');
      return;
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      // Ensure time is between 6 AM and 6 PM
      const hours = selectedDate.getHours();
      // if (hours < 6 || hours >= 18) {
      //   alert('Please select a time between 6 AM and 6 PM');
      //   return;
      // }
      setSelectedTime(selectedDate);
    }
  };

  const handleAddReminder = async () => {
    if (!reminderName.trim()) {
      alert('Please enter a reminder name');
      return;
    }

    if (frequency === 'weekly' && selectedWeekDay === undefined) {
      alert('Please select a day of the week');
      return;
    }

    console.log('Creating new reminder with:', { reminderName, frequency, selectedTime, selectedWeekDay }); // Debug log

    const newReminder: Reminder = {
      id: Date.now().toString(),
      name: reminderName,
      frequency,
      time: selectedTime,
      weekDay: frequency === 'weekly' ? selectedWeekDay : undefined
    };

    console.log('Constructed reminder object:', newReminder); // Debug log

    const stmt = db.prepareSync(
      'INSERT INTO reminders (id, name, frequency, time, weekDay) VALUES (?, ?, ?, ?, ?)'
    );
    
    try {
      const params = [
        newReminder.id,
        newReminder.name,
        newReminder.frequency,
        newReminder.time.toISOString(),
        newReminder.weekDay ?? null
      ];
      console.log('Executing SQL with params:', params); // Debug log
      
      const result = stmt.executeSync(params);
      console.log('SQL execution result:', result); // Debug log
      
      // Schedule notification
      await scheduleNotification(newReminder);
      
      console.log('Notification scheduled, loading reminders...'); // Debug log
      await loadReminders();
      
      setModalVisible(false);
      setReminderName('');
      setFrequency('daily');
      setSelectedTime(new Date());
      setSelectedWeekDay(0);
      
      console.log('Reminder saved successfully'); // Debug log
    } catch (error) {
      console.error('Error saving reminder:', error);
      Alert.alert(
        'Error',
        'Failed to save reminder. Please try again.'
      );
    } finally {
      stmt.finalizeSync();
    }
  };

  const deleteReminder = async (id: string) => {
    // First cancel the notifications
    await cancelNotification(id);

    const stmt = db.prepareSync('DELETE FROM reminders WHERE id = ?');
    try {
      stmt.executeSync([id]);
      console.log('Reminder deleted:', id);
      loadReminders();
    } catch (error) {
      console.error('Error deleting reminder:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const checkNotificationSettings = async () => {
    const stmt = db.prepareSync(
      'SELECT value FROM settings WHERE key = ?'
    );
    try {
      const results = stmt.executeSync<{ value: string }>(['reminderNotifications']);
      const rows = results.getAllSync();
      return rows.length > 0 ? rows[0].value === 'true' : true; // default to true if setting doesn't exist
    } catch (error) {
      console.error('Error checking notification settings:', error);
      return false;
    } finally {
      stmt.finalizeSync();
    }
  };

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const scheduleNotification = async (reminder: Reminder) => {
    // First check if notifications are enabled in settings
    const notificationsEnabled = await checkNotificationSettings();
    if (!notificationsEnabled) {
      console.log('Notifications are disabled in settings. Skipping notification scheduling.');
      return;
    }

    await cancelNotification(reminder.id);

    // For weekly reminders, schedule using seconds interval for exact weekly timing
    if (reminder.frequency === 'weekly' && reminder.weekDay !== undefined) {
      const now = new Date();
      const scheduledTime = new Date(reminder.time);
      scheduledTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Calculate days until next occurrence
      let daysUntilNext = reminder.weekDay - now.getDay();
      if (daysUntilNext <= 0 || (daysUntilNext === 0 && now > scheduledTime)) {
        daysUntilNext += 7;
      }
      
      // Set the correct day
      scheduledTime.setDate(scheduledTime.getDate() + daysUntilNext);
      
      // If the scheduled time is in the past, add a week
      if (scheduledTime < now) {
        scheduledTime.setDate(scheduledTime.getDate() + 7);
      }

      const trigger: TimeIntervalTriggerInput = {
        seconds: 7 * 24 * 60 * 60, // One week in seconds
        repeats: true,
        type: SchedulableTriggerInputTypes.TIME_INTERVAL
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
          body: reminder.name,
          data: { reminderId: reminder.id },
        },
        trigger
      });

      // Also schedule the first occurrence if it's different from now
      if (scheduledTime > now) {
        const initialTrigger: DateTriggerInput = {
          date: scheduledTime,
          type: SchedulableTriggerInputTypes.DATE
        };

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Reminder',
            body: reminder.name,
            data: { reminderId: reminder.id },
          },
          trigger: initialTrigger
        });
      }
      return;
    }

    // For minute/hourly reminders
    if (reminder.frequency === 'minute' || reminder.frequency === 'hourly') {
      const intervalSeconds = reminder.frequency === 'minute' ? 60 : 3600;
      
      const trigger: TimeIntervalTriggerInput = {
        seconds: intervalSeconds,
        repeats: true,
        type: SchedulableTriggerInputTypes.TIME_INTERVAL
      };
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
          body: reminder.name,
          data: { reminderId: reminder.id },
        },
        trigger
      });
      return;
    }

    // For daily reminders
    if (reminder.frequency === 'daily') {
      const now = new Date();
      const scheduledTime = new Date(reminder.time);
      scheduledTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (scheduledTime.getTime() < now.getTime()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      const trigger: TimeIntervalTriggerInput = {
        seconds: 24 * 60 * 60, // 24 hours in seconds
        repeats: true,
        type: SchedulableTriggerInputTypes.TIME_INTERVAL
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Reminder',
          body: reminder.name,
          data: { reminderId: reminder.id },
        },
        trigger
      });

      // Schedule first occurrence if it's different from now
      if (scheduledTime > now) {
        const initialTrigger: DateTriggerInput = {
          date: scheduledTime,
          type: SchedulableTriggerInputTypes.DATE
        };

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Reminder',
            body: reminder.name,
            data: { reminderId: reminder.id },
          },
          trigger: initialTrigger
        });
      }
    }
  };

  const cancelNotification = async (reminderId: string) => {
    // Clear interval if it exists
    const intervalId = intervalMap.get(reminderId);
    if (intervalId) {
      clearInterval(intervalId);
      intervalMap.delete(reminderId);
    }

    // Cancel all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduledNotifications) {
      if (notification.content.data?.reminderId === reminderId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  };

  const handleFrequencyChange = (newFrequency: 'hourly' | 'minute' | 'daily' | 'weekly') => {
    setFrequency(newFrequency);
    // If switching to minute or hourly, set the time to now
    if (newFrequency === 'minute' || newFrequency === 'hourly') {
      setSelectedTime(new Date());
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Header */}
      <View className="px-6 py-4 bg-slate-100 rounded-md mb-5 m-5 border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-gray-800 font-montserrat">Reminders</Text>
          <Text className="text-sm text-gray-500 mt-1 font-montserrat">Keep track of your important tasks</Text>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="bg-blue-500 rounded-full w-12 h-12 items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Text className="text-white text-2xl font-montserrat">+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        {reminders.map((reminder) => (
          <View 
            key={reminder.id} 
            className="bg-white my-2 rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="font-semibold text-lg text-gray-800">{reminder.name}</Text>
                <View className="flex-row items-center mt-2">
                  <View className="bg-blue-100 rounded-full px-3 p-2 py-1 mr-2">
                    <Text className="text-blue-600 text-xs font-medium">{reminder.frequency}</Text>
                  </View>
                  {(reminder.frequency === 'daily' || reminder.frequency === 'weekly') && (
                    <>
                      <Text className="text-gray-500 text-sm">
                        {reminder.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      {reminder.frequency === 'weekly' && reminder.weekDay !== undefined && (
                        <Text className="text-gray-500 text-sm ml-2">
                          on {daysOfWeek[reminder.weekDay]}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => deleteReminder(reminder.id)}
                className="w-8 h-8 rounded-full bg-red-50 items-center justify-center"
              >
                <Text className="text-red-500 text-sm">×</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/30">
          <View className="bg-white p-6 rounded-t-3xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl text-gray-800 font-montserrat-bold">New Reminder</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Text className="text-gray-500">×</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              className="bg-gray-50 rounded-xl p-4 mb-4 text-gray-800"
              placeholder="What would you like to be reminded about?"
              placeholderTextColor="#9CA3AF"
              value={reminderName}
              onChangeText={setReminderName}
            />

            <Text className="text-gray-700 font-medium mb-3 font-montserrat">Frequency</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {['hourly', 'minute', 'daily', 'weekly'].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  onPress={() => handleFrequencyChange(freq as any)}
                  className={`px-4 py-2 rounded-xl ${
                    frequency === freq 
                      ? 'bg-blue-500 border-2 border-blue-500' 
                      : 'bg-gray-100 border-2 border-gray-100'
                  }`}
                >
                  <Text className={`font-montserrat ${frequency === freq ? 'text-white font-medium' : 'text-gray-600'}`}>
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {frequency === 'weekly' && (
              <>
                <Text className="text-gray-700 font-medium mb-3 font-montserrat">Day of Week</Text>
                <View className="flex-row flex-wrap gap-2 mb-6">
                  {daysOfWeek.map((day, index) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => setSelectedWeekDay(index)}
                      className={`px-4 py-2 rounded-xl ${
                        selectedWeekDay === index
                          ? 'bg-blue-500 border-2 border-blue-500'
                          : 'bg-gray-100 border-2 border-gray-100'
                      }`}
                    >
                      <Text className={`font-montserrat ${selectedWeekDay === index ? 'text-white font-medium' : 'text-gray-600'}`}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {(frequency === 'daily' || frequency === 'weekly') && (
              <>
                <Text className="text-gray-700  mb-3 font-montserrat">Time</Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  className="bg-gray-50 rounded-xl p-4 mb-6 flex-row items-center"
                >
                  <Text className="text-gray-800 font-montserrat">
                    {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>

                {showTimePicker && Platform.OS === 'android' && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={true}
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}

            <TouchableOpacity
              onPress={handleAddReminder}
              className="bg-blue-500 rounded-xl py-4 items-center"
            >
              <Text className="text-white text-lg font-montserrat-bold">Save Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {(showTimePicker && Platform.OS === 'ios') && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={true}
          display="spinner"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert, TextInput, Platform, BackHandler, Modal, ActivityIndicator, StatusBar } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { db as firestore } from '../../firebaseConfig';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Background task names
const NOTIFICATION_TASK = 'NOTIFICATION_TASK';

// Register background task
TaskManager.defineTask(NOTIFICATION_TASK, async () => {
  try {
    const db = SQLite.openDatabaseSync('mainapp.db');

    // Check AI notifications setting
    const stmt = db.prepareSync('SELECT value FROM settings WHERE key = ?');
    const result = stmt.executeSync(['aiNotifications']);
    const settings = result.getAllSync();
    stmt.finalizeSync();

    if (settings[0]?.value !== 'true') {
      return BackgroundFetch.Result.NoData;
    }

    // Check tasks
    const taskStmt = db.prepareSync('SELECT * FROM tasks WHERE completed = 0 AND due_date <= datetime("now", "+1 day")');
    const tasks = taskStmt.executeSync().getAllSync();
    taskStmt.finalizeSync();

    // Check MCQs
    const mcqStmt = db.prepareSync('SELECT * FROM mcq_history ORDER BY completed_date DESC LIMIT 1');
    const mcqs = mcqStmt.executeSync().getAllSync();
    mcqStmt.finalizeSync();

    const lastMcqDate = mcqs[0]?.completed_date;
    const daysSinceLastMcq = lastMcqDate ?
      Math.floor((new Date() - new Date(lastMcqDate)) / (1000 * 60 * 60 * 24)) : 7;

    // Send notifications based on conditions
    if (tasks.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Arrey Shwetaa! 📚",
          body: `${tasks.length} tasks pending hai! Thoda time nikalo aur complete karo. You've got this! 💪`,
        },
        trigger: { seconds: 1 },
      });
    }

    if (daysSinceLastMcq >= 1) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "MCQs ka time ho gaya! 🎯",
          body: "Shwetaa, aaj ke MCQs solve karne ka perfect time hai. Chalo revision start karte hain!",
        },
        trigger: { seconds: 2 },
      });
    }

    // Send motivational message (twice a day - morning and evening)
    const hour = new Date().getHours();
    if (hour === 9 || hour === 18) {
      const motivationalMessages = [
        "Shwetaa, UPSC ke safar mein har kadam important hai. Aaj ka din productive banao! 🌟",
        "Keep going Shwetaa! IAS banna hai toh consistency zaroori hai. You're doing great! 💫",
        "Shwetaa, sapne bade hai toh mehnat bhi special honi chahiye. Let's crack UPSC ! 🎯",
        "The journey is tough, but so are you. Every chapter revised is one step closer to your dream.",
        "Shwetaa, aaj ka din tumhare liye ek naya mauka hai. Apne goals ke liye mehnat karo! 💪",
        "Remember, every great achievement was once considered impossible. Keep pushing!",
        "Shwetaa, UPSC ka safar ek marathon hai, sprint nahi. Thoda patience rakho aur aage badho!",
        "Some days will feel slow, but remember — even slow progress is progress.",
        "You're not just preparing for an exam, you're shaping a life of purpose and service.",
        "Stay rooted like a tree in discipline, and bloom with knowledge every day.",
      ];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "UPSC Motivation! 🔥",
          body: motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)],
        },
        trigger: { seconds: 3 },
      });
    }

    return BackgroundFetch.Result.NewData;
  } catch (error) {
    console.error('Background task error:', error);
    return BackgroundFetch.Result.Failed;
  }
});

interface SettingRow {
  key: string;
  value: string;
}

interface ApiCodeRow {
  api: string;
}

const db = SQLite.openDatabaseSync('mainapp.db');

export default function Settings() {
  const [taskNotifications, setTaskNotifications] = useState(true);
  const [reminderNotifications, setReminderNotifications] = useState(true);
  const [aiNotifications, setAiNotifications] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [deleteTablesModalVisible, setDeleteTablesModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    // Register background fetch
    async function registerBackgroundFetch() {
      try {
        await BackgroundFetch.registerTaskAsync(NOTIFICATION_TASK, {
          minimumInterval: 900, // 15 minutes
          stopOnTerminate: false,
          startOnBoot: true,
        });
      } catch (err) {
        console.error("Task Register failed:", err);
      }
    }

    registerBackgroundFetch();

    // Configure notification behavior
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    return () => {
      BackgroundFetch.unregisterTaskAsync(NOTIFICATION_TASK);
    };
  }, []);

  useEffect(() => {
    // Create settings table if it doesn't exist
    const createTableStmt = db.prepareSync(
      `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE,
        value TEXT
      );`
    );
    try {
      createTableStmt.executeSync();
    } catch (error) {
      console.error('Error creating settings table:', error);
    } finally {
      createTableStmt.finalizeSync();
    }

    // Create api_code table if it doesn't exist
    const createApiTableStmt = db.prepareSync(
      `CREATE TABLE IF NOT EXISTS api_code (
        id INTEGER PRIMARY KEY,
        api TEXT
      );`
    );
    try {
      createApiTableStmt.executeSync();
    } catch (error) {
      console.error('Error creating api_code table:', error);
    } finally {
      createApiTableStmt.finalizeSync();
    }

    // Initialize settings
    loadNotificationSettings();
  }, []);

  const syncApiCode = async () => {
    setIsSyncing(true);
    try {
      // Get API code from Firestore
      const docRef = doc(firestore, 'api_code', '1');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const apiData = docSnap.data();

        // Update or insert into SQLite
        const stmt = db.prepareSync(
          'INSERT OR REPLACE INTO api_code (id, api) VALUES (?, ?)'
        );
        stmt.executeSync([1, apiData.api]);
        stmt.finalizeSync();

        // Read all API codes from SQLite
        const selectStmt = db.prepareSync(
          'SELECT id, api FROM api_code'
        );
        const result = selectStmt.executeSync<ApiCodeRow & { id: number }>();
        const syncedData = result.getAllSync();
        selectStmt.finalizeSync();

        if (syncedData.length > 0) {
          const apiCodesMessage = syncedData
            .map(row => `ID: ${row.id}\nAPI Code: ${row.api}`)
            .join('\n\n');

          Alert.alert(
            'Success',
            `API codes synced successfully!\n\n${apiCodesMessage}`
          );
        } else {
          Alert.alert('Info', 'No API codes found in the database');
        }
      } else {
        Alert.alert('Error', 'No API code found in Firestore');
      }
    } catch (error) {
      console.error('Error syncing API code:', error);
      Alert.alert('Error', 'Failed to sync API code');
    } finally {
      setIsSyncing(false);
    }
  };

  const loadNotificationSettings = () => {
    try {
      // Initialize default settings if they don't exist
      const insertStmt = db.prepareSync(
        'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?), (?, ?), (?, ?)'
      );
      insertStmt.executeSync([
        'taskNotifications', 'true',
        'reminderNotifications', 'true',
        'aiNotifications', 'true'
      ]);
      insertStmt.finalizeSync();

      // Load settings
      const selectStmt = db.prepareSync(
        'SELECT * FROM settings WHERE key IN (?, ?, ?)'
      );
      const results = selectStmt.executeSync<SettingRow>(['taskNotifications', 'reminderNotifications', 'aiNotifications']);
      const settings = results.getAllSync();

      settings.forEach((setting: SettingRow) => {
        if (setting.key === 'taskNotifications') {
          setTaskNotifications(setting.value === 'true');
        } else if (setting.key === 'reminderNotifications') {
          setReminderNotifications(setting.value === 'true');
        } else if (setting.key === 'aiNotifications') {
          setAiNotifications(setting.value === 'true');
        }
      });

      selectStmt.finalizeSync();
    } catch (error) {
      console.error('Error loading notification settings:', error);
      Alert.alert(
        'Error',
        'Failed to load notification settings'
      );
    }
  };

  const saveNotificationSetting = (key: string, value: boolean) => {
    try {
      const stmt = db.prepareSync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
      );
      stmt.executeSync([key, value.toString()]);
      stmt.finalizeSync();
    } catch (error) {
      console.error('Error saving notification setting:', error);
      Alert.alert(
        'Error',
        'Failed to save notification setting'
      );
    }
  };

  const toggleAiNotifications = async (value: boolean) => {
    try {
      if (value) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive AI-powered alerts.'
          );
          return;
        }

        // Register background task when enabling notifications
        await BackgroundFetch.registerTaskAsync(NOTIFICATION_TASK, {
          minimumInterval: 900,
          stopOnTerminate: false,
          startOnBoot: true,
        });
      } else {
        // Unregister background task when disabling notifications
        await BackgroundFetch.unregisterTaskAsync(NOTIFICATION_TASK);
      }

      saveNotificationSetting('aiNotifications', value);
      setAiNotifications(value);
    } catch (error) {
      console.error('Error toggling AI notifications:', error);
      Alert.alert(
        'Error',
        'Failed to update AI notifications setting'
      );
    }
  };

  const toggleTaskNotifications = async (value: boolean) => {
    try {
      if (value) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive task alerts.'
          );
          return;
        }
      }

      saveNotificationSetting('taskNotifications', value);
      setTaskNotifications(value);
    } catch (error) {
      console.error('Error toggling task notifications:', error);
      Alert.alert(
        'Error',
        'Failed to update task notifications setting'
      );
    }
  };

  const toggleReminderNotifications = async (value: boolean) => {
    try {
      if (value) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive reminder alerts.'
          );
          return;
        }
      }

      saveNotificationSetting('reminderNotifications', value);
      setReminderNotifications(value);
    } catch (error) {
      console.error('Error toggling reminder notifications:', error);
      Alert.alert(
        'Error',
        'Failed to update reminder notifications setting'
      );
    }
  };

  const deleteAllTables = async () => {
    try {
      // Get all table names
      const tablesStmt = db.prepareSync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      const results = tablesStmt.executeSync();
      const tables = results.getAllSync();
      tablesStmt.finalizeSync();

      // Drop each table
      tables.forEach((table: any) => {
        const dropStmt = db.prepareSync(`DROP TABLE IF EXISTS ${table.name}`);
        dropStmt.executeSync();
        dropStmt.finalizeSync();
      });

      Alert.alert(
        'Success',
        'All tables have been deleted. The app will now restart.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (Platform.OS === 'web') {
                window.location.reload();
              } else {
                BackHandler.exitApp();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting tables:', error);
      Alert.alert('Error', 'Failed to delete tables');
    }
  };

  const backupToFirebase = async () => {
    setIsBackingUp(true);
    try {
      // Define tables to backup
      const tablesToBackup = [
        'task',
        'roadmap',
        'milestone',
        'habit',
        'manifest',
        'note',
        'mcq_test_history',
        'notes'
      ];

      const timestamp = new Date().toISOString();
      let successCount = 0;
      let failedCount = 0;

      // Backup each specified table to its own collection
      for (const tableName of tablesToBackup) {
        try {
          // Create table if it doesn't exist
          const createTableStmt = db.prepareSync(
            `CREATE TABLE IF NOT EXISTS ${tableName} (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              data TEXT
            )`
          );
          createTableStmt.executeSync();
          createTableStmt.finalizeSync();

          const selectStmt = db.prepareSync(`SELECT * FROM ${tableName}`);
          const tableData = selectStmt.executeSync().getAllSync();
          selectStmt.finalizeSync();

          // Save each row as a separate document in the table's collection
          for (let i = 0; i < tableData.length; i++) {
            const row = tableData[i];
            const docRef = doc(firestore, `table_${tableName}`, `row_${i}`);
            await setDoc(docRef, {
              ...row,
              backup_timestamp: timestamp,
              row_index: i
            });
          }

          // Save table metadata
          const metadataRef = doc(firestore, `table_${tableName}`, 'metadata');
          await setDoc(metadataRef, {
            total_rows: tableData.length,
            backup_timestamp: timestamp,
            table_name: tableName
          });

          successCount++;
        } catch (error) {
          console.warn(`Table ${tableName} not found or error reading it:`, error);
          failedCount++;
          continue;
        }
      }

      // Save overall backup metadata
      await setDoc(doc(firestore, 'backups', 'metadata'), {
        lastBackupTimestamp: timestamp,
        tables: tablesToBackup,
        successCount,
        failedCount
      });

      Alert.alert(
        'Success', 
        `Backup completed!\nSuccessfully backed up ${successCount} tables${failedCount > 0 ? `\nFailed to backup ${failedCount} tables` : ''}`
      );
    } catch (error) {
      console.error('Error backing up database:', error);
      Alert.alert('Error', 'Failed to backup database');
    } finally {
      setIsBackingUp(false);
    }
  };

  const restoreFromFirebase = async () => {
    setIsRestoring(true);
    try {
      // Get backup metadata
      const metadataRef = doc(firestore, 'backups', 'metadata');
      const metadataSnap = await getDoc(metadataRef);

      if (!metadataSnap.exists()) {
        Alert.alert('Error', 'No backup metadata found in Firebase');
        return;
      }

      const metadata = metadataSnap.data();
      const tablesToRestore = metadata.tables;

      // Begin transaction
      db.execSync('BEGIN TRANSACTION');

      try {
        // Clear existing tables
        for (const tableName of tablesToRestore) {
          const dropStmt = db.prepareSync(`DROP TABLE IF EXISTS ${tableName}`);
          dropStmt.executeSync();
          dropStmt.finalizeSync();
        }

        // Restore each table from its collection
        for (const tableName of tablesToRestore) {
          // Get table metadata
          const metadataRef = doc(firestore, `table_${tableName}`, 'metadata');
          const metadataSnap = await getDoc(metadataRef);

          if (!metadataSnap.exists()) {
            console.warn(`No backup found for table ${tableName}`);
            continue;
          }

          const metadata = metadataSnap.data();
          const totalRows = metadata.total_rows;

          // Get all rows for this table
          const rows: any[] = [];
          for (let i = 0; i < totalRows; i++) {
            const rowRef = doc(firestore, `table_${tableName}`, `row_${i}`);
            const rowSnap = await getDoc(rowRef);
            if (rowSnap.exists()) {
              const rowData = rowSnap.data();
              // Remove backup-specific fields
              const { backup_timestamp, row_index, ...row } = rowData;
              rows.push(row);
            }
          }

          if (rows.length === 0) continue;

          // Create table with correct columns
          const columns = Object.keys(rows[0]);
          const createTableSQL = `CREATE TABLE ${tableName} (${columns.map(col => `${col} TEXT`).join(', ')})`;
          const createStmt = db.prepareSync(createTableSQL);
          createStmt.executeSync();
          createStmt.finalizeSync();

          // Insert data
          const placeholders = columns.map(() => '?').join(', ');
          const insertStmt = db.prepareSync(
            `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
          );

          for (const row of rows) {
            insertStmt.executeSync(columns.map(col => String(row[col] || '')));
          }
          insertStmt.finalizeSync();
        }

        // Commit transaction
        db.execSync('COMMIT');

        Alert.alert(
          'Success',
          'Database restored successfully! The app will now restart.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (Platform.OS === 'web') {
                  window.location.reload();
                } else {
                  BackHandler.exitApp();
                }
              }
            }
          ]
        );
      } catch (error) {
        // Rollback on error
        db.execSync('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error restoring database:', error);
      Alert.alert('Error', 'Failed to restore database');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* <Text className="text-2xl font-bold mb-6">Settings</Text> */}

      {/* Sync Section */}
      {/* <View className="bg-gray-50 rounded-xl p-4 mb-4">
        
        <TouchableOpacity
          onPress={syncApiCode}
          disabled={isSyncing}
          className={`bg-blue-600 rounded-lg py-3 px-4 flex-row justify-center items-center ${isSyncing ? 'opacity-50' : ''}`}
        >
          {isSyncing ? (
            <ActivityIndicator color="white" className="mr-2" />
          ) : null}
          <Text className="text-white text-center font-semibold">
            {isSyncing ? 'Syncing API Code...' : 'Sync API Code'}
          </Text>
        </TouchableOpacity>
      </View> */}

      {/* Existing Notifications Section */}
      <View className="bg-gray-50 rounded-xl p-4">
        <Text className="text-lg font-semibold mb-4">Notifications</Text>

        {/* Task Notifications */}
        <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
          <View>
            <Text className="text-base font-medium font-montserrat">Task Notifications</Text>
            <Text className="text-sm text-gray-500 font-montserrat">Get notified about task deadlines</Text>
          </View>
          <Switch
            value={taskNotifications}
            onValueChange={toggleTaskNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={taskNotifications ? '#2563eb' : '#f4f3f4'}
          />
        </View>

        {/* AI Notifications */}
        <View className="flex-row items-center justify-between py-3 border-b border-gray-200">
          <View>
            <Text className="text-base font-medium font-montserrat">AI Notifications</Text>
            <Text className="text-sm text-gray-500 font-montserrat">Receive personalized AI-powered motivation</Text>
          </View>
          <Switch
            value={aiNotifications}
            onValueChange={toggleAiNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={aiNotifications ? '#2563eb' : '#f4f3f4'}
          />
        </View>

        {/* Reminder Notifications */}
        <View className="flex-row items-center justify-between py-3">
          <View>
            <Text className="text-base font-medium font-montserrat">Reminder Notifications</Text>
            <Text className="text-sm text-gray-500 font-montserrat">Get notified about your reminders</Text>
          </View>
          <Switch
            value={reminderNotifications}
            onValueChange={toggleReminderNotifications}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={reminderNotifications ? '#2563eb' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Backup and Restore Section */}
      <View className="bg-blue-50 rounded-xl p-4 mt-6">
        <Text className="text-lg font-semibold mb-4 text-blue-600 font-montserrat">Backup & Restore</Text>

        <TouchableOpacity
          onPress={backupToFirebase}
          disabled={isBackingUp}
          className={`bg-blue-600 rounded-lg py-3 px-4 mb-3 flex-row justify-center items-center ${isBackingUp ? 'opacity-50' : ''}`}
        >
          {isBackingUp ? (
            <ActivityIndicator color="white" className="mr-2" />
          ) : null}
          <Text className="text-white text-center font-semibold">
            {isBackingUp ? 'Backing Up...' : 'Backup'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={restoreFromFirebase}
          disabled={isRestoring}
          className={`bg-blue-600 rounded-lg py-3 px-4 flex-row justify-center items-center ${isRestoring ? 'opacity-50' : ''}`}
        >
          {isRestoring ? (
            <ActivityIndicator color="white" className="mr-2" />
          ) : null}
          <Text className="text-white text-center font-semibold">
            {isRestoring ? 'Restoring...' : 'Restore'}
          </Text>
        </TouchableOpacity>

        {/* <Text className="text-sm text-blue-500 mt-2">
          Backup your data to Firebase or restore from a previous backup.
        </Text> */}
      </View>

      {/* Danger Zone */}
      <View className="bg-red-50 rounded-xl p-4 mt-6">
        <Text className="text-lg font-semibold mb-4 text-red-600 font-montserrat">Danger Zone</Text>

        <TouchableOpacity
          onPress={() => setDeleteTablesModalVisible(true)}
          className="bg-red-700 rounded-lg py-3 px-4 mb-3"
        >
          <Text className="text-white text-center font-semibold">Delete All Tables</Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          onPress={() => setPasswordModalVisible(true)}
          className="bg-red-700 rounded-lg py-3 px-4"
        >
          <Text className="text-white text-center font-semibold">Delete Entire Database</Text>
        </TouchableOpacity> */}

        <Text className="text-sm text-red-500 mt-2">
          Warning: These actions permanently delete your data and cannot be undone.
        </Text>

        {/* Delete Tables Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={deleteTablesModalVisible}
          onRequestClose={() => {
            setDeleteTablesModalVisible(false);
            setPassword('');
          }}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white p-6 rounded-xl w-[80%] max-w-[300px]">
              <Text className="text-lg font-semibold mb-4">Delete All Tables</Text>
              <Text className="text-sm mb-4">Enter password to delete all tables</Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
              />

              <View className="flex-row justify-end gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setDeleteTablesModalVisible(false);
                    setPassword('');
                  }}
                  className="bg-gray-200 rounded-lg px-4 py-2"
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    if (password === '123456') {
                      deleteAllTables();
                      setDeleteTablesModalVisible(false);
                      setPassword('');
                    } else {
                      Alert.alert('Error', 'Incorrect password');
                    }
                  }}
                  className="bg-red-600 rounded-lg px-4 py-2"
                >
                  <Text className="text-white">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Existing Password Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={passwordModalVisible}
          onRequestClose={() => {
            setPasswordModalVisible(false);
            setPassword('');
          }}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white p-6 rounded-xl w-[80%] max-w-[300px]">
              <Text className="text-lg font-semibold mb-4">Delete Database</Text>
              <Text className="text-sm mb-4">Enter password to delete the database</Text>

              <TextInput
                className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
              />

              <View className="flex-row justify-end gap-2">
                <TouchableOpacity
                  onPress={() => {
                    setPasswordModalVisible(false);
                    setPassword('');
                  }}
                  className="bg-gray-200 rounded-lg px-4 py-2"
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    if (password === '123456') {
                      try {
                        // Close the database connection
                        db.closeSync();

                        // Delete the database file
                        const dbPath = `${FileSystem.documentDirectory}SQLite/maindb.app`;
                        await FileSystem.deleteAsync(dbPath, { idempotent: true });

                        setPasswordModalVisible(false);
                        setPassword('');

                        Alert.alert(
                          'Success',
                          'Database has been completely deleted. The app will now exit.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                if (Platform.OS === 'web') {
                                  window.location.reload();
                                } else {
                                  BackHandler.exitApp();
                                }
                              }
                            }
                          ]
                        );
                      } catch (error) {
                        console.error('Error deleting database:', error);
                        Alert.alert('Error', 'Failed to delete the database');
                      }
                    } else {
                      Alert.alert('Error', 'Incorrect password');
                    }
                  }}
                  className="bg-red-600 rounded-lg px-4 py-2"
                >
                  <Text className="text-white">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}
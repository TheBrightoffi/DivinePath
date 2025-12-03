import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, ImageBackground, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('mainapp.db');

const LandingScreen = () => {
  const router = useRouter();

  useEffect(() => {
    // Initialize all database tables
    const initializeDatabase = () => {
      // Tasks table
      const createTasksTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          taskname TEXT NOT NULL,
          description TEXT,
          duedate TEXT,
          priority TEXT,
          status TEXT DEFAULT 'pending',
          when_completed TEXT,
          created_date TEXT,
          updated_date TEXT
        );
      `);

      // Habits table
      const createHabitTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS habit (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          currentStreak INTEGER DEFAULT 0,
          highestStreak INTEGER DEFAULT 0,
          completedDates TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Reminders table
      const createRemindersTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY,
          name TEXT,
          frequency TEXT,
          time TEXT,
          weekDay INTEGER
        );
      `);

      // Notes table
      const createNotesTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS notes (
          id TEXT PRIMARY KEY,
          title TEXT,
          content TEXT,
          createdAt TEXT
        );
      `);

      // Manifest table
      const createManifestTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS manifest (
          id TEXT PRIMARY KEY,
          text TEXT,
          createdAt TEXT,
          updatedAt TEXT,
          today_done INTEGER DEFAULT 0
        );
      `);

      // Settings table
      const createSettingsTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE,
          value TEXT
        );
      `);

      // Roadmap related tables
      const createRoadmapTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS roadmap (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT,
          targetDate TEXT,
          priority TEXT,
          tags TEXT,
          progress INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const createMilestoneTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS milestone (
          id TEXT PRIMARY KEY,
          roadmap_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          startDate TEXT,
          endDate TEXT,
          status TEXT DEFAULT 'not-started',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (roadmap_id) REFERENCES roadmap (id)
        );
      `);

      const createNoteTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS note (
          id TEXT PRIMARY KEY,
          roadmap_id TEXT,
          content TEXT NOT NULL,
          date TEXT,
          FOREIGN KEY (roadmap_id) REFERENCES roadmap (id)
        );
      `);

      const createFocusTimeTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS focustime (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          startTime TEXT,
          endTime TEXT,
          duration INTEGER,
          status TEXT,
          date TEXT
        );
      `);

      // MCQ Subject table
      const createMcqSubjectTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS mcqsubject (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          active INTEGER DEFAULT 1,
          revised INTEGER DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
          subjectId INTEGER
        );
      `);

      // MCQs table
      const createMcqsTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS mcqs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mcqsubject_id INTEGER,
          chapterId TEXT,
          question TEXT NOT NULL,
          option1 TEXT NOT NULL,
          option2 TEXT NOT NULL,
          option3 TEXT NOT NULL,
          option4 TEXT NOT NULL,
          answer TEXT NOT NULL,
          explanation TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (mcqsubject_id) REFERENCES mcqsubject (id)
        );
      `);

      // MCQ Test History table
      const createMcqTestHistoryTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS mcq_test_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mcqsubject_id INTEGER,
          total_questions INTEGER,
          correct_answers INTEGER,
          score_percentage REAL,
          date TEXT,
          elapsed_time INTEGER,
          FOREIGN KEY (mcqsubject_id) REFERENCES mcqsubject (id)
        );
      `);

      const createRemainderDayTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS remainder_day (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          completed INTEGER DEFAULT 0
        );
      `);

      const createApiCodeTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS api_code (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          api TEXT NOT NULL
        );
      `);

      const createAnalysisStmt = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS mcq_analysis (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subject_name TEXT,
          what_to_improve TEXT
        )
      `);

      // Syllabus tracking tables
      const createSubjectsTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS syllabus_subjects (
          id TEXT PRIMARY KEY,
          subject_name TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_subjects_name ON syllabus_subjects(subject_name);
      `);

      const createTopicsTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS syllabus_topics (
          id TEXT PRIMARY KEY,
          subject_id TEXT NOT NULL,
          topic_name TEXT NOT NULL,
          FOREIGN KEY (subject_id) REFERENCES syllabus_subjects (id)
        );
        CREATE INDEX IF NOT EXISTS idx_topics_subject ON syllabus_topics(subject_id);
        CREATE INDEX IF NOT EXISTS idx_topics_name ON syllabus_topics(topic_name);
      `);

      const createSyllabusTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS syllabus_items (
          id TEXT PRIMARY KEY,
          topic_id TEXT NOT NULL,
          topic_name TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          FOREIGN KEY (topic_id) REFERENCES syllabus_topics (id)
        );
        CREATE INDEX IF NOT EXISTS idx_syllabus_topic ON syllabus_items(topic_id);
        CREATE INDEX IF NOT EXISTS idx_syllabus_completion ON syllabus_items(completed);
      `);

      try {
        // Execute all table creation statements
        createTasksTable.executeSync();
        createHabitTable.executeSync();
        createRemindersTable.executeSync();
        createNotesTable.executeSync();
        createManifestTable.executeSync();
        createSettingsTable.executeSync();
        createRoadmapTable.executeSync();
        createMilestoneTable.executeSync();
        createNoteTable.executeSync();
        createFocusTimeTable.executeSync();
        createMcqSubjectTable.executeSync();
        createMcqsTable.executeSync();
        createMcqTestHistoryTable.executeSync();
        createRemainderDayTable.executeSync();
        createApiCodeTable.executeSync();
        createAnalysisStmt.executeSync();
        createSubjectsTable.executeSync();
        createTopicsTable.executeSync();
        createSyllabusTable.executeSync();

        // Insert initial manifest data
        const insertInitialManifest = db.prepareSync(`
          INSERT OR IGNORE INTO manifest (id, text, createdAt, updatedAt, today_done)
          VALUES (?, ?, datetime('now'), datetime('now'), 0)
        `);

        // Insert default API code
        const insertApiCode = db.prepareSync(`
          INSERT OR IGNORE INTO api_code (api) VALUES (?)
        `);

        try {
          insertInitialManifest.executeSync(['default-manifest', '"Every day, I grow stronger, wiser, and closer to my dream"']);
          insertApiCode.executeSync(['api']);
        
        } catch (error) {
         
        } finally {
          insertInitialManifest.finalizeSync();
          insertApiCode.finalizeSync();
        }
        

        console.log('All database tables initialized successfully');
      } catch (error) {
        console.error('Error initializing database tables:', error);
    
      } finally {
        // Clean up all prepared statements
        createTasksTable.finalizeSync();
        createHabitTable.finalizeSync();
        createRemindersTable.finalizeSync();
        createNotesTable.finalizeSync();
        createManifestTable.finalizeSync();
        createSettingsTable.finalizeSync();
        createRoadmapTable.finalizeSync();
        createMilestoneTable.finalizeSync();
        createNoteTable.finalizeSync();
        createFocusTimeTable.finalizeSync();
        createMcqSubjectTable.finalizeSync();
        createMcqsTable.finalizeSync();
        createMcqTestHistoryTable.finalizeSync();
        createRemainderDayTable.finalizeSync();
        createApiCodeTable.finalizeSync();
        createAnalysisStmt.finalizeSync();
        createSubjectsTable.finalizeSync();
        createTopicsTable.finalizeSync();
        createSyllabusTable.finalizeSync();
      }
    };

    // Ensure mcqchapters table exists
    const createChaptersTable = db.prepareSync(`
      CREATE TABLE IF NOT EXISTS mcqchapters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subjectId INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        chapterId TEXT,
        solved_count INTEGER DEFAULT 0,
        FOREIGN KEY (subjectId) REFERENCES mcqsubject (id)
      )
    `);
    createChaptersTable.executeSync();
    createChaptersTable.finalizeSync();

    // Initialize database and navigate after timeout
    initializeDatabase();
    const timer = setTimeout(() => {
      router.replace('/(tools)/Manifest');
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ImageBackground 
        source={require('../assets/10677367.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
      <View style={styles.overlay}>
        {/* <Text style={styles.title}>“Welcome back, Shweta! Ready to conquer today?”</Text> */}
      </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontFamily: 'Montserrat',
  },
  title: {
    fontSize: 12,
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginBottom: 70,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
});

export default LandingScreen;
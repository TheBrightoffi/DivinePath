import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet,StatusBar } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { db as firestoreDb } from '../../firebaseConfig';
import { collection, getDocs, addDoc, query, orderBy, where } from 'firebase/firestore';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const db = SQLite.openDatabaseSync('mainapp.db');

interface Subject {
  id: string;
  subject_name: string;
}

interface Topic {
  id: string;
  subject_id: string;
  topic_name: string;
}

interface Syllabus {
  id: string;
  topic_id: string;
  topic_name: string;
  completed: boolean;
}

interface SubjectRow {
  id: string | null;
  subject_name: string | null;
}

interface TopicRow {
  id: string | null;
  subject_id: string | null;
  topic_name: string | null;
}

interface SyllabusRow {
  id: string | null;
  topic_id: string | null;
  topic_name: string | null;
  completed: number;
}

interface PaginationInfo {
  currentPage: number;
  itemsPerPage: number;
  hasMore: boolean;
}

interface SQLiteRow {
  count: number;
}

const renderShimmerLoading = () => {
  return (
    <View style={{ gap: 16, paddingHorizontal: 8 }}>
      {[1, 2, 3].map((key) => (
        <View key={key} style={styles.topicCard}>
          <ShimmerPlaceholder
            style={{ width: '60%', height: 24, borderRadius: 4, marginBottom: 8 }}
          />
          <ShimmerPlaceholder
            style={{ width: '40%', height: 16, borderRadius: 4, marginBottom: 16 }}
          />
          <View style={{ gap: 12 }}>
            {[1, 2, 3].map((itemKey) => (
              <ShimmerPlaceholder
                key={itemKey}
                style={{ width: '100%', height: 20, borderRadius: 4 }}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

export default function SyllabusTracker() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [syllabusItems, setSyllabusItems] = useState<Syllabus[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    itemsPerPage: 100, // Increased to 100 items per batch
    hasMore: true
  });
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    initializeDatabase();
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadTopicsForSubject(selectedSubject);
    } else {
      setTopics([]);
      setSyllabusItems([]);
    }
  }, [selectedSubject]);

  const initializeDatabase = () => {
    try {
      // Create tables if they don't exist (removed DROP TABLE statements)
      const createSubjectsTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS syllabus_subjects (
          id TEXT PRIMARY KEY,
          subject_name TEXT NOT NULL
        )
      `);

      const createTopicsTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS syllabus_topics (
          id TEXT PRIMARY KEY,
          subject_id TEXT NOT NULL,
          topic_name TEXT NOT NULL,
          FOREIGN KEY (subject_id) REFERENCES syllabus_subjects (id)
        )
      `);

      const createSyllabusTable = db.prepareSync(`
        CREATE TABLE IF NOT EXISTS syllabus_items (
          id TEXT PRIMARY KEY,
          topic_id TEXT NOT NULL,
          topic_name TEXT NOT NULL,
          completed INTEGER DEFAULT 0,
          FOREIGN KEY (topic_id) REFERENCES syllabus_topics (id)
        )
      `);

      createSubjectsTable.executeSync();
      createTopicsTable.executeSync();
      createSyllabusTable.executeSync();

      createSubjectsTable.finalizeSync();
      createTopicsTable.finalizeSync();
      createSyllabusTable.finalizeSync();
    } catch (error) {
      console.error('Error initializing database:', error);
      Alert.alert('Error', 'Failed to initialize database');
    }
  };

  const checkIfDataExists = () => {
    try {
      const stmt = db.prepareSync('SELECT COUNT(*) as count FROM syllabus_subjects');
      const result = stmt.executeSync();
      const row = result.getAllSync()[0] as SQLiteRow;
      stmt.finalizeSync();
      return row.count > 0;
    } catch (error) {
      console.error('Error checking data existence:', error);
      return false;
    }
  };

  const syncFromFirebase = async () => {
    // Check if data already exists
    if (checkIfDataExists()) {
      Alert.alert(
        'Data Already Exists',
        'Local data already exists. Do you want to sync and update it anyway?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Yes',
            onPress: () => performSync()
          }
        ]
      );
      return;
    }

    // If no data exists, sync without asking
    await performSync();
  };

  const performSync = async () => {
    setSyncing(true);
    try {
      // Sync subjects
      const subjectsSnapshot = await getDocs(collection(firestoreDb, 'syllabus_subject'));
      const insertSubjectStmt = db.prepareSync(
        'INSERT OR REPLACE INTO syllabus_subjects (id, subject_name) VALUES (?, ?)'
      );
      
      for (const doc of subjectsSnapshot.docs) {
        const data = doc.data();
        try {
          insertSubjectStmt.executeSync([doc.id, data.subject_name || '']);
        } catch (error) {
          console.error('Error inserting subject:', doc.id, error);
        }
      }
      insertSubjectStmt.finalizeSync();

      // Sync topics
      const topicsSnapshot = await getDocs(collection(firestoreDb, 'syllabus_topic'));
      const insertTopicStmt = db.prepareSync(
        'INSERT OR REPLACE INTO syllabus_topics (id, subject_id, topic_name) VALUES (?, ?, ?)'
      );
      
      for (const doc of topicsSnapshot.docs) {
        const data = doc.data();
        try {
          insertTopicStmt.executeSync([
            doc.id,
            data.subject_id || '',
            data.topic_name || ''
          ]);
        } catch (error) {
          console.error('Error inserting topic:', doc.id, error);
        }
      }
      insertTopicStmt.finalizeSync();

      // Sync syllabus items
      const syllabusSnapshot = await getDocs(collection(firestoreDb, 'syllabus'));
      const insertSyllabusStmt = db.prepareSync(
        'INSERT OR REPLACE INTO syllabus_items (id, topic_id, topic_name, completed) VALUES (?, ?, ?, ?)'
      );
      
      for (const doc of syllabusSnapshot.docs) {
        const data = doc.data();
        try {
          insertSyllabusStmt.executeSync([
            doc.id,
            data.topic_id || '',
            data.topic_name || '',
            data.completed ? 1 : 0
          ]);
        } catch (error) {
          console.error('Error inserting syllabus item:', doc.id, error);
        }
      }
      insertSyllabusStmt.finalizeSync();

      // Reload data
      loadSubjects();
      Alert.alert('Success', 'Data synchronized successfully');
    } catch (error) {
      console.error('Error syncing data:', error);
      Alert.alert('Error', 'Failed to sync data');
    } finally {
      setSyncing(false);
    }
  };

  const loadSubjects = () => {
    try {
      setLoading(true);
      const stmt = db.prepareSync('SELECT * FROM syllabus_subjects ORDER BY subject_name');
      const results = stmt.executeSync();
      const subjectsData = results.getAllSync().map((row: unknown) => {
        const typedRow = row as SubjectRow;
        return {
          id: typedRow.id?.toString() || '',
          subject_name: typedRow.subject_name?.toString() || ''
        };
      });
      setSubjects(subjectsData);
      stmt.finalizeSync();
    } catch (error) {
      console.error('Error loading subjects:', error);
      Alert.alert('Error', 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const loadTopicsForSubject = async (subjectId: string, shouldReset: boolean = true) => {
    try {
      if (shouldReset) {
        setLoading(true);
        setPagination({
          currentPage: 1,
          itemsPerPage: 100,
          hasMore: true
        });
      } else {
        setLoadingMore(true);
      }

      const offset = (pagination.currentPage - 1) * pagination.itemsPerPage;
      
      // Load topics with pagination
      const topicsStmt = db.prepareSync(`
        SELECT * FROM syllabus_topics 
        WHERE subject_id = ? 
        ORDER BY topic_name
        LIMIT ? OFFSET ?
      `);
      
      const topicsResults = topicsStmt.executeSync([
        subjectId,
        pagination.itemsPerPage,
        offset
      ]);
      
      const topicsData = topicsResults.getAllSync().map((row: TopicRow) => ({
        id: row.id?.toString() || '',
        subject_id: row.subject_id?.toString() || '',
        topic_name: row.topic_name?.toString() || ''
      }));
      
      topicsStmt.finalizeSync();

      // Check if there are more topics
      const countStmt = db.prepareSync('SELECT COUNT(*) as count FROM syllabus_topics WHERE subject_id = ?');
      const countResult = countStmt.executeSync([subjectId]);
      const row = countResult.getAllSync()[0] as SQLiteRow;
      const totalCount = row.count;
      countStmt.finalizeSync();

      const hasMore = totalCount > offset + topicsData.length;

      if (shouldReset) {
        setTopics(topicsData);
      } else {
        setTopics(prev => [...prev, ...topicsData]);
      }

      setPagination(prev => ({
        ...prev,
        hasMore,
        currentPage: shouldReset ? 1 : prev.currentPage
      }));

      // Load syllabus items for visible topics only
      if (topicsData.length > 0) {
        const topicIds = topicsData.map(t => t.id);
        const syllabusStmt = db.prepareSync(`
          SELECT * FROM syllabus_items 
          WHERE topic_id IN (${topicIds.map(() => '?').join(',')})
          ORDER BY topic_name
        `);
        
        const syllabusResults = syllabusStmt.executeSync(topicIds);
        const syllabusData = syllabusResults.getAllSync().map((row: SyllabusRow) => ({
          id: row.id?.toString() || '',
          topic_id: row.topic_id?.toString() || '',
          topic_name: row.topic_name?.toString() || '',
          completed: row.completed === 1
        }));
        
        syllabusStmt.finalizeSync();

        if (shouldReset) {
          setSyllabusItems(syllabusData);
        } else {
          setSyllabusItems(prev => [...prev, ...syllabusData]);
        }
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      Alert.alert('Error', 'Failed to load topics');
    } finally {
      if (shouldReset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const loadMoreTopics = useCallback(() => {
    if (!loadingMore && pagination.hasMore && selectedSubject) {
      setPagination(prev => ({
        ...prev,
        currentPage: prev.currentPage + 1
      }));
      loadTopicsForSubject(selectedSubject, false);
    }
  }, [loadingMore, pagination.hasMore, selectedSubject]);

  const toggleCompletion = async (syllabusItem: Syllabus) => {
    try {
      const stmt = db.prepareSync(
        'UPDATE syllabus_items SET completed = ? WHERE id = ?'
      );
      stmt.executeSync([!syllabusItem.completed ? 1 : 0, syllabusItem.id]);
      stmt.finalizeSync();
      
      // Update local state instead of reloading everything
      setSyllabusItems(prev => 
        prev.map(item => 
          item.id === syllabusItem.id 
            ? { ...item, completed: !item.completed }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating completion status:', error);
      Alert.alert('Error', 'Failed to update completion status');
    }
  };

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: any) => {
    const paddingToBottom = 20; // Trigger when within 20px of bottom
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  const handleScroll = useCallback(({ nativeEvent }: any) => {
    if (isCloseToBottom(nativeEvent)) {
      loadMoreTopics();
    }
  }, [loadMoreTopics]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Header with Sync Button */}
      <View style={styles.header}>
        <View>
          <Text className="headerTitle font-montserrat">
            Track your learning progress
          </Text>
        </View>
        <TouchableOpacity
          onPress={syncFromFirebase}
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          disabled={syncing}
        >
          {syncing ? (
            <View style={styles.syncButtonContent}>
              <ActivityIndicator color="white" size="small" style={styles.syncLoader} />
              <Text style={styles.syncButtonText}>Syncing...</Text>
            </View>
          ) : (
            <Text className="text-white font-montserrat">Sync Data</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Subject Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.subjectScroll}
        contentContainerStyle={styles.subjectScrollContent}
      >
        {/* <TouchableOpacity
          onPress={() => setSelectedSubject('')}
          style={[styles.subjectButton, selectedSubject === '' && styles.subjectButtonActive]}
        >
          <Text style={[styles.subjectButtonText, selectedSubject === '' && styles.subjectButtonTextActive]}>
            All Subjects
          </Text>
        </TouchableOpacity> */}
        {subjects.map(subject => (
          <TouchableOpacity
            key={subject.id}
            onPress={() => setSelectedSubject(subject.id)}
            style={[styles.subjectButton, selectedSubject === subject.id && styles.subjectButtonActive]}
          >
            <Text style={[styles.subjectButtonText, selectedSubject === subject.id && styles.subjectButtonTextActive]}>
              {subject.subject_name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Topics with Syllabus Items */}
      <ScrollView 
        style={styles.topicsScroll}
        contentContainerStyle={styles.topicsScrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400} // Throttle scroll events
      >
        {loading ? (
          renderShimmerLoading()
        ) : (
          <>
            {topics
              .filter(topic => !selectedSubject || topic.subject_id === selectedSubject)
              .map(topic => {
                const topicSyllabusItems = syllabusItems.filter(
                  item => item.topic_id === topic.id
                );
                const subject = subjects.find(s => s.id === topic.subject_id);

                return (
                  <View 
                    key={topic.id} 
                    style={styles.topicCard}
                  >
                    <View style={styles.topicHeader}>
                      <Text style={styles.topicTitle}>
                        {topic.topic_name}
                      </Text>
                      <Text style={styles.topicSubtitle}>
                        {subject?.subject_name}
                      </Text>
                    </View>
                    <View style={styles.syllabusItems}>
                      {topicSyllabusItems.map(item => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => toggleCompletion(item)}
                          style={styles.syllabusItem}
                          activeOpacity={0.7}
                        >
                          <View 
                            style={[
                              styles.checkbox,
                              item.completed && styles.checkboxCompleted
                            ]}
                          >
                            {item.completed && (
                              <Text style={styles.checkmark}>✓</Text>
                            )}
                          </View>
                          <Text 
                            style={[
                              styles.syllabusItemText,
                              item.completed && styles.syllabusItemTextCompleted
                            ]}
                          >
                            {item.topic_name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            {loadingMore && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'Montserrat-Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Montserrat-Regular',
  },
  syncButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
  syncButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncLoader: {
    marginRight: 8,
  },
  syncButtonText: {
    color: 'white',
    fontFamily: 'Montserrat-SemiBold',
  },
  subjectScroll: {
    marginBottom: 32,
    maxHeight: 48,
    overflow: 'hidden',
    height: 48,
  },
  subjectScrollContent: {
    paddingHorizontal: 8,
  },
  subjectButton: {
    marginRight: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subjectButtonActive: {
    backgroundColor: '#2563EB',
  },
  subjectButtonText: {
    color: '#374151',
    fontFamily: 'Montserrat-SemiBold',
  },
  subjectButtonTextActive: {
    color: 'white',
  },
  topicsScroll: {
    flex: 1,
  },
  topicsScrollContent: {
    paddingBottom: 16,
    paddingHorizontal: 8,
  },
  topicCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topicHeader: {
    marginBottom: 16,
  },
  topicTitle: {
    fontSize: 20,
    color: '#1F2937',
    fontFamily: 'Montserrat-Bold',
  },
  topicSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Montserrat-Medium',
  },
  syllabusItems: {
    gap: 12,
  },
  syllabusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
  },
  syllabusItemText: {
    flex: 1,
    color: '#374151',
    fontFamily: 'Montserrat-Regular',
  },
  syllabusItemTextCompleted: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    color: '#6B7280',
    fontFamily: 'Montserrat-Regular',
  },
});
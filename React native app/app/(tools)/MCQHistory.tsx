import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { db as firestoreDb } from '../../firebaseConfig';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';

interface TestAttempt {
  id: string;
  subjectId: string;
  subjectTitle: string;
  chapterId?: string;
  chapterTitle?: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  date: any;
  elapsedTime: number;
}

export default function MCQHistory() {
  const router = useRouter();
  const [testHistory, setTestHistory] = useState<TestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTestHistory();
  }, []);

  const loadTestHistory = async () => {
    try {
      setIsLoading(true);
      const q = query(
        collection(firestoreDb, 'testHistory'),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      })) as TestAttempt[];
      setTestHistory(historyData);
    } catch (error) {
      console.error('Error loading test history:', error);
      Alert.alert('Error', 'Failed to load test history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const deleteTestAttempt = (id: string) => {
    Alert.alert(
      "Delete Test Result",
      "Are you sure you want to delete this test result?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(firestoreDb, 'testHistory', id));
              await loadTestHistory();
              Alert.alert('Success', 'Test result deleted');
            } catch (error) {
              console.error('Error deleting test history:', error);
              Alert.alert('Error', 'Failed to delete test result');
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50 p-4">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">Loading test history...</Text>
        </View>
      ) : (
        <ScrollView>
          {testHistory.map((attempt) => (
            <View key={attempt.id} className="bg-white p-4 rounded-lg mb-3 shadow-sm">
              <View className="flex-row justify-between items-start">
                <View className="flex-1">
                  <Text className="text-lg font-bold">{attempt.subjectTitle}</Text>
                  {attempt.chapterTitle && (
                    <Text className="text-sm text-gray-600">{attempt.chapterTitle}</Text>
                  )}
                </View>
                <TouchableOpacity 
                  onPress={() => deleteTestAttempt(attempt.id)}
                  className="bg-red-100 p-2 rounded-full"
                >
                  <Text className="text-red-600">×</Text>
                </TouchableOpacity>
              </View>
              <View className="mt-2">
                <Text>Date: {attempt.date ? new Date(attempt.date).toLocaleDateString() : 'N/A'}</Text>
                <Text>Questions: {attempt.totalQuestions}</Text>
                <Text>Correct Answers: {attempt.correctAnswers}</Text>
                <Text>Time Taken: {formatTime(attempt.elapsedTime)}</Text>
                <Text className="font-bold mt-1">
                  Score: {attempt.scorePercentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}

          {testHistory.length === 0 && (
            <View className="flex-1 justify-center items-center mt-10">
              <Text className="text-gray-500">No test attempts yet</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
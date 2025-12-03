import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '../../firebaseConfig';

interface MCQChapter {
  id: string;
  chapterId: string;
  subjectId: string;
  title: string;
  description: string;
  createdAt: any;
  solved_count: number;
}

export default function MCQChapters() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const subjectId = Array.isArray(params.subjectId) ? params.subjectId[0] : params.subjectId;
  const [chapters, setChapters] = useState<MCQChapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (subjectId) {
      loadChapters();
    }
  }, [subjectId]); // Reload chapters when subjectId changes

  const loadChapters = async () => {
    if (!subjectId) {
      console.log('No subjectId provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log('Loading chapters for subjectId:', subjectId);
      
      // Try to convert to number for backward compatibility with old numeric IDs
      const numericId = Number(subjectId);
      const searchId = isNaN(numericId) ? subjectId : numericId;
      
      console.log('Searching with ID:', searchId, 'Type:', typeof searchId);
      
      const q = query(
        collection(firestoreDb, 'mcqchapters'),
        where('subjectId', '==', searchId)
      );
      const querySnapshot = await getDocs(q);
      const chaptersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as MCQChapter[];
      
      // Sort chapters in descending order by createdAt (most recent first)
      const sortedChapters = chaptersData.sort((a, b) => {
        // Primary sort: by createdAt in descending order
        if (a.createdAt && b.createdAt) {
          return a.createdAt.getTime() - b.createdAt.getTime();
        }
        // Fallback to chapterId if createdAt is not available
        if (a.chapterId && b.chapterId) {
          return Number(b.chapterId) - Number(a.chapterId);
        }
        return 0;
      });
      
      console.log('Found chapters:', sortedChapters.length);
      setChapters(sortedChapters);
    } catch (error) {
      console.error('Error loading chapters:', error);
      Alert.alert('Error', 'Failed to load chapters from Firestore');
      setChapters([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChapterPress = (chapter: MCQChapter) => {
    router.push({
      pathname: '/(tools)/MCQ2',
      params: { chapterId: chapter.chapterId }
    });
  };


  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
 
      <ScrollView className="flex-1 px-4 py-6">
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="mt-4 text-gray-600">Loading chapters...</Text>
          </View>
        ) : chapters.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-gray-500 text-center">No chapters available for this subject.</Text>
            <TouchableOpacity
              onPress={loadChapters}
              className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-semibold">Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-3">
            {chapters.map((chapter) => (
              <TouchableOpacity
                key={chapter.id}
                onPress={() => handleChapterPress(chapter)}
                className="bg-white rounded-xl p-4 mt-2 shadow-sm border border-gray-100"
              >
                <Text className="text-lg text-gray-800 font-montserrat-bold mb-2">{chapter.title}</Text>
                <Text className="text-blue-700 font-montserrat-bold text-sm">{chapter.solved_count || 0} solved</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

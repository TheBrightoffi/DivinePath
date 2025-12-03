import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { db as firestoreDb } from '../../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';

interface MCQSubject {
  id: string;
  title: string;
  description: string;
  active: boolean;
  revised: boolean;
  createdAt?: any;
  lastUpdated?: any;
}

interface MCQChapter {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  createdAt?: any;
}

interface MCQ {
  id: string;
  subjectId: string;
  chapterId?: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  answer: string;
  explanation: string;
  createdAt?: any;
  lastUpdated?: any;
}

export default function MCQ1() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<MCQSubject[]>([]);
  const [chapters, setChapters] = useState<MCQChapter[]>([]);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [mcqModalVisible, setMcqModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredSubjects, setFilteredSubjects] = useState<MCQSubject[]>([]);

  // Subject form states
  const [subjectTitle, setSubjectTitle] = useState('');
  const [subjectDescription, setSubjectDescription] = useState('');
  const [editingSubject, setEditingSubject] = useState<MCQSubject | null>(null);

  // MCQ form states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [option4, setOption4] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [editingMcq, setEditingMcq] = useState<MCQ | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      await Promise.all([loadSubjects(), loadChapters(), loadMcqs()]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data from Firestore');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const q = query(collection(firestoreDb, 'mcqsubjects'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const subjectsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Store the old numeric subjectId if it exists for backward compatibility
          legacySubjectId: data.subjectId,
          createdAt: data.createdAt?.toDate(),
          lastUpdated: data.lastUpdated?.toDate(),
        };
      }) as any[];
      setSubjects(subjectsData);
      setFilteredSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading subjects:', error);
      throw error;
    }
  };

  const loadChapters = async () => {
    try {
      const q = query(collection(firestoreDb, 'mcqchapters'), orderBy('title'));
      const querySnapshot = await getDocs(q);
      const chaptersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as MCQChapter[];
      setChapters(chaptersData);
    } catch (error) {
      console.error('Error loading chapters:', error);
      throw error;
    }
  };

  const loadMcqs = async () => {
    try {
      const q = query(collection(firestoreDb, 'mcqs'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const mcqsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastUpdated: doc.data().lastUpdated?.toDate(),
      })) as MCQ[];
      setMcqs(mcqsData);
    } catch (error) {
      console.error('Error loading MCQs:', error);
      throw error;
    }
  };

  const handleAddSubject = async () => {
    if (!subjectTitle.trim()) {
      Alert.alert('Error', 'Please enter a subject title');
      return;
    }

    try {
      const subjectData = {
        title: subjectTitle.trim(),
        description: subjectDescription.trim(),
        active: true,
        revised: false,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      };

      if (editingSubject) {
        await updateDoc(doc(firestoreDb, 'mcqsubjects', editingSubject.id), {
          ...subjectData,
          createdAt: editingSubject.createdAt,
        });
        Alert.alert('Success', 'Subject updated successfully');
      } else {
        await addDoc(collection(firestoreDb, 'mcqsubjects'), subjectData);
        Alert.alert('Success', 'Subject added successfully');
      }

      await loadSubjects();
      resetSubjectForm();
      setSubjectModalVisible(false);
    } catch (error) {
      console.error('Error saving subject:', error);
      Alert.alert('Error', 'Failed to save subject');
    }
  };

  const handleAddMcq = async () => {
    if (!selectedSubjectId || !question.trim() || !option1.trim() || !option2.trim() || !answer.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const mcqData = {
        subjectId: selectedSubjectId,
        chapterId: selectedChapterId || null,
        question: question.trim(),
        option1: option1.trim(),
        option2: option2.trim(),
        option3: option3.trim(),
        option4: option4.trim(),
        answer: answer.trim(),
        explanation: explanation.trim(),
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      };

      if (editingMcq) {
        await updateDoc(doc(firestoreDb, 'mcqs', editingMcq.id), {
          ...mcqData,
          createdAt: editingMcq.createdAt,
        });
        Alert.alert('Success', 'MCQ updated successfully');
      } else {
        await addDoc(collection(firestoreDb, 'mcqs'), mcqData);
        Alert.alert('Success', 'MCQ added successfully');
      }

      await loadMcqs();
      resetMcqForm();
      setMcqModalVisible(false);
    } catch (error) {
      console.error('Error saving MCQ:', error);
      Alert.alert('Error', 'Failed to save MCQ');
    }
  };



  const resetSubjectForm = () => {
    setSubjectTitle('');
    setSubjectDescription('');
    setEditingSubject(null);
  };

  const resetMcqForm = () => {
    setSelectedSubjectId(null);
    setQuestion('');
    setOption1('');
    setOption2('');
    setOption3('');
    setOption4('');
    setAnswer('');
    setExplanation('');
    setEditingMcq(null);
  };

  const handleSubjectPress = (subject: any) => {
    // Use the legacy numeric subjectId if it exists, otherwise use the Firestore document ID
    const idToPass = subject.legacySubjectId || subject.id;
    router.push({
      pathname: '/(tools)/MCQChapters',
      params: { subjectId: idToPass.toString() }
    });
  };

  const searchSubjects = (text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setFilteredSubjects(subjects);
      return;
    }

    const filtered = subjects.filter(subject =>
      subject.title.toLowerCase().includes(text.toLowerCase()) ||
      subject.description.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredSubjects(filtered);
  };

  const toggleRevisionStatus = async (subject: MCQSubject) => {
    try {
      await updateDoc(doc(firestoreDb, 'mcqsubjects', subject.id), {
        revised: !subject.revised,
        lastUpdated: serverTimestamp()
      });
      await loadSubjects();
    } catch (error) {
      console.error('Error updating revision status:', error);
      Alert.alert('Error', 'Failed to update revision status');
    }
  };

  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* Header */}
      <View className="bg-white px-6 shadow-md flex-row justify-between items-center">
        <View>
          <Text className="text-2xl text-gray-800 font-montserrat-bold">Subjects</Text>
          <Text className="text-gray-600 font-montserrat">Select a subject to view chapters</Text>
        </View>
        <LottieView
          source={require('../../assets/profile_lottie.json')}
          autoPlay
          loop
          style={{ height: 100, width: 100 }}
        />
      </View>
      <ScrollView className="flex-1 px-4 py-6">
        <View className="flex-row justify-between items-center space-x-3 mb-8">
          <TextInput
            className="flex-1 bg-white px-4 py-2.5 rounded-full shadow-sm border border-gray-200"
            placeholder="Search"
            value={searchText}
            onChangeText={searchSubjects}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            onPress={loadData}
            disabled={isLoading}
            className={`flex-row items-center bg-blue-600 px-4 py-2.5 rounded-full shadow-sm ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading && (
              <ActivityIndicator size="small" color="white" className="mr-2" />
            )}
            <Text className="text-white font-semibold font-montserrat">Refresh</Text>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text className="mt-4 text-gray-600">Loading subjects...</Text>
          </View>
        ) : filteredSubjects.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-gray-500 text-center">
              {searchText ? 'No subjects found matching your search' : 'No subjects available. Add your first subject!'}
            </Text>
          </View>
        ) : (
          <View className="mb-8">
            <View className="space-y-3">
              {filteredSubjects.map((subject) => (
              <TouchableOpacity
                key={subject.id}
                onPress={() => handleSubjectPress(subject)}
                className="bg-white rounded-xl p-4 mt-2 shadow-sm border border-gray-100"
              >
                <Text className="text-lg text-gray-800 mb-1 font-montserrat-bold">{subject.title}</Text>
                <Text className="text-gray-600 mb-3 font-montserrat">{subject.description}</Text>
              </TouchableOpacity>
            ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
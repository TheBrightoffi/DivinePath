import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, StatusBar, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db as firestoreDb } from '../../firebaseConfig';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const GEMINI_API_KEY = 'AIzaSyC15WxvxN9kdt2h_YdAQEdn6O-C6WgZTnI';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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

interface MCQSubject {
  id: string;
  title: string;
  description: string;
}

interface MCQChapter {
  id: string;
  subjectId: string;
  title: string;
  description: string;
}

export default function MCQ2() {
  const params = useLocalSearchParams();
  const router = useRouter();
  // Accept chapterId as string (Firebase chapterId)
  const chapterId = Array.isArray(params.chapterId) ? params.chapterId[0] : params.chapterId;
  
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isTablet = screenWidth >= 768;
  const isLargeScreen = screenWidth >= 1024;
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [subject, setSubject] = useState<MCQSubject | null>(null);
  const [chapter, setChapter] = useState<MCQChapter | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerStarted, setTimerStarted] = useState(false);
  const [explanationType, setExplanationType] = useState<'regular' | 'ai'>('regular');
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [explanationModalVisible, setExplanationModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hintModalVisible, setHintModalVisible] = useState(false);
  const [hintText, setHintText] = useState('');
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize timer when component mounts
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    setTimerStarted(true);
    timerInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, []); // Empty dependency array means it runs once when component mounts

  const loadMcqs = async () => {
    if (!chapterId) return;
    
    console.log('Loading MCQs for chapterId:', chapterId);
    setIsLoading(true);
    try {
      // Try both string and number formats due to data inconsistency
      const numericChapterId = Number(chapterId);
      const stringChapterId = chapterId.toString();
      
      console.log('Searching MCQs with chapterId (string):', stringChapterId, 'and (number):', numericChapterId);
      
      // First try with string format
      let q = query(
        collection(firestoreDb, 'mcqs'),
        where('chapterId', 'in', [stringChapterId, numericChapterId])
      );
      let querySnapshot = await getDocs(q);
      
      // Convert docs to MCQs and sort by creation date
      const mcqsData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          lastUpdated: doc.data().lastUpdated?.toDate(),
        }))
        .filter(mcq => 
          mcq.chapterId === stringChapterId || 
          mcq.chapterId === numericChapterId ||
          (typeof mcq.chapterId === 'number' && 
           (mcq.chapterId === Number(stringChapterId) || 
            (stringChapterId && mcq.chapterId.toString() === stringChapterId)))
        )
        .sort((a, b) => 
          (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
        ) as MCQ[];
      console.log('Found MCQs:', mcqsData.length);
      setMcqs(mcqsData);
    } catch (error) {
      console.error('Error loading MCQs:', error);
      Alert.alert('Error', 'Failed to load MCQs from Firestore');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMcqs();
    loadSubjectAndChapter();
  }, [chapterId]); // Reload MCQs and subject when chapterId changes

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const loadSubjectAndChapter = async () => {
    if (!chapterId) return;
    
    console.log('Loading subject and chapter for chapterId:', chapterId);
    try {
      // Convert chapterId to number for backward compatibility
      const numericChapterId = Number(chapterId);
      const searchChapterId = isNaN(numericChapterId) ? chapterId : numericChapterId;
      
      // Load chapter
      const chapterQuery = query(
        collection(firestoreDb, 'mcqchapters'),
        where('chapterId', '==', searchChapterId)
      );
      const chapterSnapshot = await getDocs(chapterQuery);
      
      if (!chapterSnapshot.empty) {
        const chapterData = {
          id: chapterSnapshot.docs[0].id,
          ...chapterSnapshot.docs[0].data()
        } as MCQChapter;
        setChapter(chapterData);
        console.log('Chapter data found:', chapterData);
        
        // Load subject using subjectId from chapter (numeric field)
        try {
          console.log('Querying subject with subjectId:', chapterData.subjectId, 'Type:', typeof chapterData.subjectId);
          const subjectQuery = query(
            collection(firestoreDb, 'mcqsubjects'),
            where('subjectId', '==', chapterData.subjectId)
          );
          const subjectSnapshot = await getDocs(subjectQuery);
          console.log('Subject query completed, found:', subjectSnapshot.size, 'documents');
          
          if (!subjectSnapshot.empty) {
            const subjectData = {
              id: subjectSnapshot.docs[0].id,
              ...subjectSnapshot.docs[0].data()
            } as MCQSubject;
            console.log('Subject data found:', subjectData);
            setSubject(subjectData);
          } else {
            console.log('No subject found with subjectId:', chapterData.subjectId);
          }
        } catch (subjectError) {
          console.error('Error loading subject:', subjectError);
          // Continue even if subject loading fails
        }
      }
    } catch (error) {
      console.error('Error loading subject and chapter:', error);
    }
  };



  const saveTestResults = async () => {
    if (isSaving) return; // Prevent multiple submissions
    
    setIsSaving(true);
    try {
      const scorePercentage = (correctAnswers / mcqs.length) * 100;
      
      if (chapter && subject) {
        // Save test history to Firestore
        await addDoc(collection(firestoreDb, 'testHistory'), {
          subjectId: subject.id,
          subjectTitle: subject.title,
          chapterId: chapterId,
          chapterTitle: chapter.title,
          totalQuestions: mcqs.length,
          correctAnswers: correctAnswers,
          scorePercentage: scorePercentage,
          elapsedTime: elapsedTime,
          date: serverTimestamp(),
        });
        
        // Update chapter solved count in Firestore
        await updateChapterSolvedCount(chapterId);
      }

      Alert.alert(
        'Test Completed! 🎉',
        `Score: ${scorePercentage.toFixed(1)}%\n${correctAnswers} out of ${mcqs.length} questions correct!\n\n "Shwets, every MCQ you solve is a victory in your journey. Keep going, you're getting closer to your dreams with every step! 🌟 Keep believing in yourself!"`,
        [
          {
            text: 'View History',
            onPress: () => router.push('/(tools)/MCQHistory')
          },
          {
            text: 'Done',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error saving test results:', error);
      Alert.alert('Error', 'Failed to save test results');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnswerSelect = (option: string, index: number) => {
    const letter = String.fromCharCode(97 + index);
    setSelectedAnswer(letter);
    const currentMcq = mcqs[currentQuestionIndex];
    const isCorrect = letter === currentMcq.answer.toLowerCase();
    setIsAnswerCorrect(isCorrect);
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < mcqs.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setIsAnswerCorrect(null);
      setShowExplanation(false);
    } else {
      saveTestResults();
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#000" />
        <Text className="mt-4 text-gray-600">Loading MCQs...</Text>
        <Text className="mt-2 text-sm text-gray-500">Chapter ID: {chapterId}</Text>
      </View>
    );
  }

  if (mcqs.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-6">
        <Text className="text-xl text-gray-800 mb-4 text-center">No MCQs Found</Text>
        <Text className="text-gray-600 text-center mb-6">
          No MCQs available for this chapter.
        </Text>
        <Text className="text-sm text-gray-500 mb-4">Chapter ID: {chapterId}</Text>
        <TouchableOpacity
          onPress={loadMcqs}
          className="bg-blue-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-3"
        >
          <Text className="text-gray-600">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentMcq = mcqs[currentQuestionIndex];
  
  if (!currentMcq) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>No MCQ available</Text>
      </View>
    );
  }

  const generateAIExplanation = async () => {
    setIsLoadingAI(true);
    try {
      const prompt = `Question: ${currentMcq.question}
    Options:
    A. ${currentMcq.option1}
    B. ${currentMcq.option2}
    C. ${currentMcq.option3}
    D. ${currentMcq.option4}
    Correct Answer: ${currentMcq.answer.toUpperCase()}
    
    Please provide a brief, clear explanation of why this answer is correct. Keep it concise and easy to understand.`;

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        setAiExplanation(data.candidates[0].content.parts[0].text);
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error generating AI explanation:', error);
      setAiExplanation('Failed to generate AI explanation. Please try again.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const updateChapterSolvedCount = async (chapterId: string) => {
    try {
      // Convert chapterId to number for backward compatibility
      const numericChapterId = Number(chapterId);
      const searchChapterId = isNaN(numericChapterId) ? chapterId : numericChapterId;
      
      const chapterQuery = query(
        collection(firestoreDb, 'mcqchapters'),
        where('chapterId', '==', searchChapterId)
      );
      const chapterSnapshot = await getDocs(chapterQuery);
      
      if (!chapterSnapshot.empty) {
        const chapterDoc = chapterSnapshot.docs[0];
        const currentCount = chapterDoc.data().solved_count || 0;
        
        await updateDoc(doc(firestoreDb, 'mcqchapters', chapterDoc.id), {
          solved_count: currentCount + 1
        });
        console.log('Solved count updated in Firestore');
      }
    } catch (error) {
      console.log('Failed to update solved count:', error);
    }
  };


  const generateHint = async () => {
    setIsLoadingHint(true);
    setHintModalVisible(true);
    setHintText('');
    
    try {
      const prompt = `Give a SHORT hint (maximum 2-3 sentences) for this MCQ question. DO NOT reveal the answer.

Question: ${currentMcq.question}
Options:
A. ${currentMcq.option1}
B. ${currentMcq.option2}
C. ${currentMcq.option3}
D. ${currentMcq.option4}

Provide only a brief, concise hint focusing on one key concept or elimination strategy. Keep it under 50 words.`;

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        setHintText(data.candidates[0].content.parts[0].text);
      } else {
        throw new Error('Invalid response format from API');
      }
    } catch (error) {
      console.error('Error generating hint:', error);
      setHintText('Failed to generate hint. Please try again.');
    } finally {
      setIsLoadingHint(false);
    }
  };

  const handleExplanationPress = () => {
    setExplanationModalVisible(true);
    // Reset AI explanation when opening modal
    setAiExplanation('');
    setExplanationType('regular');
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View className="bg-white shadow-sm">
        <View className={`flex-row items-center justify-between ${isTablet ? 'px-8 py-4' : 'px-4 py-3'} bg-white border-b border-gray-200`}>
          <TouchableOpacity 
            onPress={() => router.back()}
            className={`${isTablet ? 'p-3' : 'p-2'} rounded-full`}
            style={{ minWidth: isTablet ? 48 : 40, minHeight: isTablet ? 48 : 40 }}
          >
            <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="#374151" />
          </TouchableOpacity>
          <Text className={`${isTablet ? 'text-2xl' : 'text-lg'} font-semibold text-gray-800 text-center flex-1 mx-4`}>
            Question {currentQuestionIndex + 1} of {mcqs.length}
          </Text>
          <TouchableOpacity 
            onPress={generateHint}
            className={`bg-blue-500 ${isTablet ? 'px-6 py-3' : 'px-3 py-1.5'} rounded-lg`}
            style={{ minWidth: isTablet ? 80 : 60, minHeight: isTablet ? 48 : 36 }}
          >
            <Text className={`text-white ${isTablet ? 'text-base' : 'text-sm'} font-medium text-center`}>Hint</Text>
          </TouchableOpacity>
        </View>

        <View className={`flex-row items-center ${isTablet ? 'px-8 py-4' : 'px-4 py-2'} rounded-full self-start`}>
          <Text className={`text-blue-700 font-medium ${isTablet ? 'text-lg' : 'text-base'} font-montserrat`}>
            {formatTime(elapsedTime)}
          </Text>
        </View>
      </View>
      <ScrollView className={`flex-1 ${isTablet ? 'px-8' : 'px-4'} pt-4`}>
        {/* Question Card */}
        <View className={`bg-white rounded-2xl shadow-lg mb-4 overflow-hidden ${isTablet ? 'max-w-4xl mx-auto' : ''}`}>
          {/* Question */}
          <View className={`${isTablet ? 'p-8' : 'p-6'} border-b border-gray-100`}>
            <Text className={`${isTablet ? 'text-xl' : 'text-md'} text-gray-800 leading-relaxed font-montserrat`}>
              {currentMcq.question}
            </Text>
          </View>

          {/* Options */}
          <View className={`${isTablet ? 'p-8' : 'p-6'} space-y-4`}>
            {[ 
              currentMcq.option1,
              currentMcq.option2,
              currentMcq.option3,
              currentMcq.option4
            ].map((option, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleAnswerSelect(option, index)}
                className={`${isTablet ? 'p-6' : 'p-4'} rounded-xl mt-2 border-2 ${selectedAnswer === String.fromCharCode(97 + index)
                  ? isAnswerCorrect
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                  : 'border-gray-200 active:bg-gray-50'
                  }`}
                disabled={selectedAnswer !== null}
              >
                <Text className={`${isTablet ? 'text-lg' : 'text-base'} font-montserrat ${selectedAnswer === String.fromCharCode(97 + index)
                  ? isAnswerCorrect
                    ? 'text-green-700 font-medium'
                    : 'text-red-700 font-medium'
                  : 'text-gray-700'
                  }`}>
                  {String.fromCharCode(65 + index)}. {option}
                </Text>
              </TouchableOpacity>
            ))}

          </View>

          {/* Result & Explanation */}
          {selectedAnswer && (
            <View className="p-6 bg-gray-50">
              <Text className={`text-lg mb-3 font-montserrat ${isAnswerCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {isAnswerCorrect ? '✓ Correct!' : '✗ Incorrect!'}
                <Text className="text-gray-600 font-normal ml-2">
                  The correct answer was {currentMcq.answer.toUpperCase()}.
                </Text>
              </Text>

              <TouchableOpacity
                onPress={handleExplanationPress}
                className="mb-4"
              >
                <Text className="text-blue-600 font-montserrat text-lg font-semibold">
                  + Show Explanation
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNextQuestion}
                disabled={isSaving}
                className={`bg-blue-600 p-4 rounded-xl active:bg-blue-700 ${isSaving ? 'opacity-50' : ''}`}
              >
                {isSaving && currentQuestionIndex === mcqs.length - 1 ? (
                  <View className="flex-row justify-center items-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white text-center font-semibold text-lg ml-2">
                      Saving...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white text-center font-semibold text-lg">
                    {currentQuestionIndex < mcqs.length - 1 ? 'Next Question →' : 'Finish Quiz'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Explanation Modal */}
      <Modal
        visible={explanationModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setExplanationModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className={`bg-white ${isTablet ? 'w-[80%] max-w-2xl' : 'w-[90%]'} rounded-2xl shadow-xl ${isTablet ? 'p-8' : 'p-6'}`}>
            <View className="flex-row justify-between items-center mb-6">
              <Text className={`${isTablet ? 'text-3xl' : 'text-2xl'} text-gray-800`}>Explanation</Text>
              <TouchableOpacity
                onPress={() => setExplanationModalVisible(false)}
                className={`${isTablet ? 'p-3' : 'p-2'} rounded-full bg-gray-100`}
                style={{ minWidth: isTablet ? 44 : 36, minHeight: isTablet ? 44 : 36 }}
              >
                <Ionicons name="close" size={isTablet ? 24 : 20} color="#374151" />
              </TouchableOpacity>
            </View>

            <View className="flex-row space-x-2 mb-6">
              <TouchableOpacity
                onPress={() => setExplanationType('regular')}
                className={`px-4 py-2 rounded-full ${explanationType === 'regular' ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
              >
                <Text className={explanationType === 'regular' ? 'text-white' : 'text-gray-700'}>
                  Regular
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setExplanationType('ai');
                  if (!aiExplanation) {
                    generateAIExplanation();
                  }
                }}
                className={`px-4 py-2 rounded-full ${explanationType === 'ai' ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
              >
                <Text className={explanationType === 'ai' ? 'text-white' : 'text-gray-700'}>
                  AI Analysis
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} className="border-t border-gray-100 pt-4">
              {explanationType === 'regular' ? (
                <View className="p-4 bg-gray-50 rounded-xl">
                  <Text className="text-gray-700 leading-relaxed text-base">
                    {currentMcq.explanation || 'No explanation available for this question.'}
                  </Text>
                </View>
              ) : (
                <View className="p-4 bg-gray-50 rounded-xl">
                  {isLoadingAI ? (
                    <View className="items-center py-4">
                      <ActivityIndicator size="large" color="#3B82F6" />
                      <Text className="text-gray-600 mt-2">Generating AI explanation...</Text>
                    </View>
                  ) : (
                    <Text className="text-gray-700 leading-relaxed text-base">
                      {aiExplanation || 'Press the AI Analysis button to generate an explanation.'}
                    </Text>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Hint Modal */}
      <Modal
        visible={hintModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setHintModalVisible(false)}
      >
        <View className="flex-1 bg-white">
          <View className={`flex-row items-center justify-between ${isTablet ? 'p-6' : 'p-4'} border-b border-gray-200`}>
            <Text className={`${isTablet ? 'text-2xl' : 'text-xl'} font-bold text-gray-800`}>💡 Hint</Text>
            <TouchableOpacity 
              onPress={() => setHintModalVisible(false)}
              className={`bg-gray-100 ${isTablet ? 'p-3' : 'p-2'} rounded-full`}
              style={{ minWidth: isTablet ? 44 : 36, minHeight: isTablet ? 44 : 36 }}
            >
              <Ionicons name="close" size={isTablet ? 24 : 20} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView className={`flex-1 ${isTablet ? 'p-8' : 'p-4'}`}>
            <View className="mb-4">
              <Text className={`${isTablet ? 'text-xl' : 'text-lg'} font-semibold text-gray-800 mb-2`}>Question:</Text>
              <Text className={`text-gray-700 leading-relaxed ${isTablet ? 'text-lg' : 'text-base'}`}>
                {currentMcq.question}
              </Text>
            </View>

            <View className={`${isTablet ? 'p-6' : 'p-4'} bg-blue-50 rounded-xl`}>
              {isLoadingHint ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text className={`text-blue-600 mt-3 text-center ${isTablet ? 'text-lg' : 'text-base'}`}>
                    Analyzing question and generating hint...
                  </Text>
                </View>
              ) : (
                <Text className={`text-gray-700 leading-relaxed ${isTablet ? 'text-lg' : 'text-base'}`}>
                  {hintText || 'Click the hint button to get AI-powered guidance!'}
                </Text>
              )}
            </View>

            <View className={`mt-6 ${isTablet ? 'p-6' : 'p-4'} bg-yellow-50 rounded-xl border border-yellow-200`}>
              <Text className={`text-yellow-800 ${isTablet ? 'text-base' : 'text-sm'} font-medium`}>
                💡 This hint is designed to guide your thinking without revealing the answer directly.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
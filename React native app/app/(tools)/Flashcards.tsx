import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert,StatusBar } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs } from 'firebase/firestore';

interface Subject {
  id: string;
  subject_name: string;
}

interface Chapter {
  id: string;
  name: string;
  subject_id: string;
}

interface Flashcard {
  id: string;
  title: string;
  description: string;
  subject_id: string;
  chapter_id: string;
  favorite: boolean;
}

export default function FlashcardsForm() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch subjects
    const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
    const subjectsList = subjectsSnapshot.docs.map(doc => ({
      id: doc.id,
      subject_name: doc.data().subject_name,
    }));
    setSubjects(subjectsList);

    // Fetch chapters
    const chaptersSnapshot = await getDocs(collection(db, 'chapters'));
    const chaptersList = chaptersSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().chapter_name,
      subject_id: doc.data().subject_id,
    }));
    setChapters(chaptersList);

    // Fetch flashcards
    const flashcardsSnapshot = await getDocs(collection(db, 'flashcards'));
    const flashcardsList = flashcardsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Flashcard[];
    setFlashcards(flashcardsList);
  };

  const handleAddFlashcard = async () => {
    if (!selectedSubject || !selectedChapter || !title.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await addDoc(collection(db, 'flashcards'), {
        subject_id: selectedSubject,
        chapter_id: selectedChapter,
        title: title.trim(),
        description: description.trim(),
        favorite: false,
      });

      setTitle('');
      setDescription('');
      Alert.alert('Success', 'Flashcard added successfully!');
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error adding flashcard:', error);
      Alert.alert('Error', 'Failed to add flashcard');
    }
  };

  const filteredChapters = chapters.filter(
    chapter => chapter.subject_id === selectedSubject
  );

  return (
    <ScrollView className="flex-1 bg-gray-50 p-4">
       <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Text className="text-2xl font-montserrat-bold text-gray-800 mb-6">Create Flashcard</Text>

      {/* Subject Selection */}
      <Text className="text-base font-medium mb-2">Select Subject</Text>
      <View className="bg-white rounded-lg border border-gray-200 mb-4">
        <Picker
          selectedValue={selectedSubject}
          onValueChange={(itemValue) => {
            setSelectedSubject(itemValue);
            setSelectedChapter(''); // Reset chapter when subject changes
          }}
        >
          <Picker.Item label="Select a Subject" value="" />
          {subjects.map((subject) => (
            <Picker.Item 
              key={subject.id} 
              label={subject.subject_name} 
              value={subject.id} 
            />
          ))}
        </Picker>
      </View>

      {/* Chapter Selection */}
      {selectedSubject && (
        <>
          <Text className="text-base font-medium mb-2">Select Chapter</Text>
          <View className="bg-white rounded-lg border border-gray-200 mb-4">
            <Picker
              selectedValue={selectedChapter}
              onValueChange={setSelectedChapter}
            >
              <Picker.Item label="Select a Chapter" value="" />
              {filteredChapters.map((chapter) => (
                <Picker.Item 
                  key={chapter.id} 
                  label={chapter.name} 
                  value={chapter.id} 
                />
              ))}
            </Picker>
          </View>
        </>
      )}

      {/* Flashcard Title */}
      <TextInput
        className="bg-white border border-gray-200 rounded-lg p-4 mb-4"
        placeholder="Flashcard Title"
        value={title}
        onChangeText={setTitle}
      />

      {/* Flashcard Description */}
      <TextInput
        className="bg-white border border-gray-200 rounded-lg p-4 mb-6"
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {/* Submit Button */}
      <TouchableOpacity
        className="bg-blue-600 p-4 rounded-lg"
        onPress={handleAddFlashcard}
      >
        <Text className="text-white text-center font-semibold">Create Flashcard</Text>
      </TouchableOpacity>

      {/* Existing Flashcards */}
      <View className="mt-8">
        <Text className="text-xl font-montserrat-bold text-gray-800 mb-4">Your Flashcards</Text>
        {flashcards.map((flashcard) => {
          const subject = subjects.find(s => s.id === flashcard.subject_id);
          const chapter = chapters.find(c => c.id === flashcard.chapter_id);
          
          return (
            <View key={flashcard.id} className="bg-white p-4 rounded-lg mb-3 border border-gray-100">
              <Text className="font-montserrat-bold text-lg text-gray-800">{flashcard.title}</Text>
              <Text className="text-gray-600 mt-1">{flashcard.description}</Text>
              <View className="flex-row mt-2">
                <Text className="text-blue-600 text-sm">{subject?.subject_name}</Text>
                <Text className="text-gray-400 mx-2">•</Text>
                <Text className="text-blue-600 text-sm">{chapter?.name}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
"use client";

import { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore';

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
  timestamp: Timestamp;
  card_no: number;
}

export default function FlashcardPage() {
  // Subject and Chapter Management States
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [priority, setPriority] = useState(1);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Flashcard Creation States
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
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
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load data');
    }
  };

  const handleAddSubject = async () => {
    if (!subject.trim()) {
      alert('Please enter a subject name');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'subjects'), {
        subject_name: subject,
        active: true,
        revised: new Date()
      });
      setSubject('');
      setSubjectId(docRef.id);
      alert('Subject added successfully!');
      fetchData(); // Refresh all data
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Failed to add subject');
    }
  };

  const handleAddChapter = async () => {
    if (!chapter.trim() || !subjectId) {
      alert('Please enter chapter name and select a subject');
      return;
    }

    try {
      await addDoc(collection(db, 'chapters'), {
        subject_id: subjectId,
        chapter_name: chapter,
        priority,
        revised: new Date()
      });
      setChapter('');
      setPriority(1);
      alert('Chapter added successfully!');
      fetchData(); // Refresh all data
    } catch (error) {
      console.error('Error adding chapter:', error);
      alert('Failed to add chapter');
    }
  };

  const handleAddFlashcard = async () => {
    if (!selectedSubject || !selectedChapter || !title.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Get the current count of flashcards to set the card_no
      const flashcardsSnapshot = await getDocs(collection(db, 'flashcards'));
      const currentCardNo = flashcardsSnapshot.size + 1;

      await addDoc(collection(db, 'flashcards'), {
        subject_id: selectedSubject,
        chapter_id: selectedChapter,
        title: title.trim(),
        description: description.trim(),
        favorite: false,
        timestamp: new Date(),
        card_no: currentCardNo,
      });

      setTitle('');
      setDescription('');
      alert('Flashcard added successfully!');
      fetchData(); // Refresh all data
    } catch (error) {
      console.error('Error adding flashcard:', error);
      alert('Failed to add flashcard');
    }
  };

  const filteredChapters = chapters.filter(
    chapter => chapter.subject_id === selectedSubject
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Flashcard Management</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Subject and Chapter Management */}
          <div className="space-y-6">
            {/* Add Subject Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Subject</h2>
              <input
                className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Subject Name"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <button
                onClick={handleAddSubject}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Add Subject
              </button>
            </div>

            {/* Add Chapter Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Chapter</h2>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Subject</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.subject_name}
                  </option>
                ))}
              </select>

              {subjectId && (
                <>
                  <input
                    className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Chapter Name"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                  />
                  
                  <input
                    type="number"
                    className="w-full border border-gray-300 p-3 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Priority (1 to 5)"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    min={1}
                    max={5}
                  />

                  <button
                    onClick={handleAddChapter}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                    Add Chapter
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Flashcard Creation */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">Create Flashcard</h2>

              {/* Subject Selection */}
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => {
                  setSelectedSubject(e.target.value);
                  setSelectedChapter(''); // Reset chapter when subject changes
                }}
                className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>

              {/* Chapter Selection */}
              {selectedSubject && (
                <>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Chapter
                  </label>
                  <select
                    value={selectedChapter}
                    onChange={(e) => setSelectedChapter(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a Chapter</option>
                    {filteredChapters.map((chapter) => (
                      <option key={chapter.id} value={chapter.id}>
                        {chapter.name}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* Flashcard Title */}
              <input
                className="w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Flashcard Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              {/* Flashcard Description */}
              <textarea
                className="w-full border border-gray-300 p-3 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />

              {/* Submit Button */}
              <button
                onClick={handleAddFlashcard}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Create Flashcard
              </button>
            </div>

            {/* Existing Flashcards */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Flashcards</h2>
              <div className="space-y-3">
                {flashcards.map((flashcard) => {
                  const subject = subjects.find(s => s.id === flashcard.subject_id);
                  const chapter = chapters.find(c => c.id === flashcard.chapter_id);
                  
                  return (
                    <div key={flashcard.id} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <h3 className="font-semibold text-lg text-gray-800">{flashcard.title}</h3>
                      <p className="text-gray-600 mt-1">{flashcard.description}</p>
                      <div className="flex items-center mt-2 text-sm">
                        <span className="text-blue-600">{subject?.subject_name}</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-blue-600">{chapter?.name}</span>
                        <span className="text-gray-400 mx-2">•</span>
                        <span className="text-gray-500">{flashcard.timestamp.toDate().toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
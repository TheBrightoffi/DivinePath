"use client";

import { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, query, orderBy, where, updateDoc } from 'firebase/firestore';

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

export default function SyllabusPage() {
  // States for forms
  const [subjectName, setSubjectName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [topicName, setTopicName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [syllabusTopicName, setSyllabusTopicName] = useState('');

  // States for data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [syllabusItems, setSyllabusItems] = useState<Syllabus[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadSubjects(),
      loadTopics(),
      loadSyllabus()
    ]);
  };

  const loadSubjects = async () => {
    try {
      const subjectsRef = collection(db, 'syllabus_subject');
      const q = query(subjectsRef, orderBy('subject_name'));
      const querySnapshot = await getDocs(q);
      const subjectsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subject[];
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadTopics = async () => {
    try {
      const topicsRef = collection(db, 'syllabus_topic');
      const q = query(topicsRef, orderBy('topic_name'));
      const querySnapshot = await getDocs(q);
      const topicsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Topic[];
      setTopics(topicsData);
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const loadSyllabus = async () => {
    try {
      const syllabusRef = collection(db, 'syllabus');
      const q = query(syllabusRef, orderBy('topic_name'));
      const querySnapshot = await getDocs(q);
      const syllabusData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Syllabus[];
      setSyllabusItems(syllabusData);
    } catch (error) {
      console.error('Error loading syllabus:', error);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      alert('Please enter a subject name');
      return;
    }

    try {
      await addDoc(collection(db, 'syllabus_subject'), {
        subject_name: subjectName.trim()
      });
      setSubjectName('');
      loadSubjects();
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Failed to add subject');
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject || !topicName.trim()) {
      alert('Please select a subject and enter a topic name');
      return;
    }

    try {
      await addDoc(collection(db, 'syllabus_topic'), {
        subject_id: selectedSubject,
        topic_name: topicName.trim()
      });
      setTopicName('');
      loadTopics();
    } catch (error) {
      console.error('Error adding topic:', error);
      alert('Failed to add topic');
    }
  };

  const handleAddSyllabus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTopic || !syllabusTopicName.trim()) {
      alert('Please select a topic and enter a topic name');
      return;
    }

    try {
      await addDoc(collection(db, 'syllabus'), {
        topic_id: selectedTopic,
        topic_name: syllabusTopicName.trim(),
        completed: false
      });
      setSyllabusTopicName('');
      loadSyllabus();
    } catch (error) {
      console.error('Error adding syllabus item:', error);
      alert('Failed to add syllabus item');
    }
  };

  const handleToggleCompletion = async (syllabusItem: Syllabus) => {
    try {
      const syllabusRef = collection(db, 'syllabus');
      const q = query(syllabusRef, where('topic_id', '==', syllabusItem.topic_id));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.docs.forEach(async (doc) => {
        await updateDoc(doc.ref, {
          completed: !syllabusItem.completed
        });
      });
      
      // Reload syllabus data
      loadSyllabus();
    } catch (error) {
      console.error('Error toggling completion:', error);
      alert('Failed to update completion status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Syllabus Management</h1>
          <a 
            href="/syllabus/excel"
            className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
          >
            Excel Upload
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Subject Form */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Subject</h2>
            <form onSubmit={handleAddSubject}>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Enter subject name"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 mb-4"
              />
              <button
                type="submit"
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
              >
                Add Subject
              </button>
            </form>
          </div>

          {/* Topic Form */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Topic</h2>
            <form onSubmit={handleAddTopic}>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 mb-4"
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                placeholder="Enter topic name"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 mb-4"
              />
              <button
                type="submit"
                className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
              >
                Add Topic
              </button>
            </form>
          </div>

          {/* Syllabus Form */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Syllabus Item</h2>
            <form onSubmit={handleAddSyllabus}>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 mb-4"
              >
                <option value="">Select Topic</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.topic_name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={syllabusTopicName}
                onChange={(e) => setSyllabusTopicName(e.target.value)}
                placeholder="Enter syllabus topic name"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 mb-4"
              />
              <button
                type="submit"
                className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600"
              >
                Add Syllabus Item
              </button>
            </form>
          </div>
        </div>

        {/* Data Display */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Subjects List */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Subjects</h2>
            <div className="space-y-2">
              {subjects.map((subject) => (
                <div key={subject.id} className="p-3 bg-gray-50 rounded-lg">
                  {subject.subject_name}
                </div>
              ))}
            </div>
          </div>

          {/* Topics List */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Topics</h2>
            <div className="space-y-2">
              {topics.map((topic) => (
                <div key={topic.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{topic.topic_name}</p>
                  <p className="text-sm text-gray-500">
                    Subject: {subjects.find(s => s.id === topic.subject_id)?.subject_name}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Syllabus List */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Syllabus Items</h2>
            <div className="space-y-2">
              {syllabusItems.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium">{item.topic_name}</p>
                  <p className="text-sm text-gray-500">
                    Topic: {topics.find(t => t.id === item.topic_id)?.topic_name}
                  </p>
                  <p className={`text-sm ${item.completed ? 'text-green-500' : 'text-red-500'}`}>
                    Status: {item.completed ? 'Completed' : 'Pending'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subject Filter and Topics Section */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Progress Tracker</h2>
          
          {/* Subject Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setFilterSubject('')}
              className={`px-4 py-2 rounded-lg ${
                filterSubject === '' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setFilterSubject(subject.id)}
                className={`px-4 py-2 rounded-lg ${
                  filterSubject === subject.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {subject.subject_name}
              </button>
            ))}
          </div>

          {/* Topics with Checkboxes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topics
              .filter(topic => !filterSubject || topic.subject_id === filterSubject)
              .map((topic) => {
                const topicSyllabusItems = syllabusItems.filter(
                  item => item.topic_id === topic.id
                );
                
                return (
                  <div key={topic.id} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">{topic.topic_name}</h3>
                    <div className="space-y-2">
                      {topicSyllabusItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleCompletion(item)}
                            className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                          />
                          <span className={item.completed ? 'line-through text-gray-500' : ''}>
                            {item.topic_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
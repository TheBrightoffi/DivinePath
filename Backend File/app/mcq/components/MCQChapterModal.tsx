"use client";

import { useState, useEffect } from 'react';
import type { MCQSubject } from '../page';
import { db } from '../../../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

interface MCQChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  subjects: MCQSubject[];
}

export default function MCQChapterModal({ isOpen, onClose, onSave, subjects }: MCQChapterModalProps) {
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterDescription, setChapterDescription] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  useEffect(() => {
    setChapterTitle('');
    setChapterDescription('');
    setSelectedSubjectId(subjects.length > 0 ? subjects[0].id || '' : '');
  }, [isOpen, subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim()) {
      alert('Please enter a chapter title');
      return;
    }
    if (!selectedSubjectId) {
      alert('Please select a subject');
      return;
    }
    try {
      // Find the selected subject to get its sqliteId
      const selectedSubject = subjects.find(subject => subject.id === selectedSubjectId);
      const subjectSqliteId = selectedSubject ? selectedSubject.sqliteId : selectedSubjectId;
      const chapterSqliteId = Date.now();
      const chapterData = {
        title: chapterTitle,
        description: chapterDescription,
        subjectId: subjectSqliteId,
        sqliteId: chapterSqliteId,
        createdAt: new Date(),
      };
      await addDoc(collection(db, 'mcqchapters'), chapterData);
      onSave();
      onClose();
  setChapterTitle('');
  setChapterDescription('');
  setSelectedSubjectId(subjects.length > 0 ? subjects[0].id || '' : '');
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Failed to save chapter');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Add MCQ Chapter</h2>
        <form onSubmit={handleSubmit}>
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
            placeholder="Chapter Title"
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
          />
          <textarea
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-800"
            placeholder="Description"
            value={chapterDescription}
            onChange={(e) => setChapterDescription(e.target.value)}
            rows={3}
          />
          <select
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-800"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.title}
              </option>
            ))}
          </select>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-green-500 text-white font-semibold"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

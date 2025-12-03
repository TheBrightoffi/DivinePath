"use client";

import { useState } from 'react';
import { db } from '../../../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

interface MCQSubject {
  id: string;
  title: string;
  description: string;
  active: boolean;
  revised: boolean;
  sqliteId: number;
}

interface MCQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  subjects: MCQSubject[];
}

export default function MCQModal({ isOpen, onClose, onSave, subjects }: MCQModalProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [question, setQuestion] = useState('');
  const [option1, setOption1] = useState('');
  const [option2, setOption2] = useState('');
  const [option3, setOption3] = useState('');
  const [option4, setOption4] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSubjectId || !question.trim() || !option1.trim() || !option2.trim() || 
        !option3.trim() || !option4.trim() || !answer.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const validAnswers = ['a', 'b', 'c', 'd'];
    const normalizedAnswer = answer.toLowerCase().trim();
    if (!validAnswers.includes(normalizedAnswer)) {
      alert('Answer must be a letter between a and d');
      return;
    }

    try {
      // Find the selected subject to get its sqliteId
      const selectedSubject = subjects.find(subject => subject.id === selectedSubjectId);
      if (!selectedSubject) {
        alert('Selected subject not found');
        return;
      }

      const mcqData = {
        mcqsubject_id: selectedSubject.sqliteId,
        question,
        option1,
        option2,
        option3,
        option4,
        answer: normalizedAnswer,
        explanation,
        createdAt: new Date(),
        lastUpdated: new Date()
      };

      await addDoc(collection(db, 'mcqs'), mcqData);
      onSave();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Error adding MCQ:', error);
      alert('Failed to add MCQ');
    }
  };

  const resetForm = () => {
    setSelectedSubjectId('');
    setQuestion('');
    setOption1('');
    setOption2('');
    setOption3('');
    setOption4('');
    setAnswer('');
    setExplanation('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New MCQ</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
            >
              <option value="">Select a subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
              rows={3}
              placeholder="Enter your question"
            />
          </div>

          {['A', 'B', 'C', 'D'].map((option, index) => (
            <div key={option}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Option {option}
              </label>
              <input
                value={[option1, option2, option3, option4][index]}
                onChange={(e) => [setOption1, setOption2, setOption3, setOption4][index](e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
                placeholder={`Enter option ${option}`}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Correct Answer (a, b, c, or d)
            </label>
            <input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
              placeholder="Enter letter of correct answer"
              maxLength={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Explanation (Optional)
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800"
              rows={3}
              placeholder="Enter explanation for the correct answer"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-semibold"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from 'react';
import { db } from '../../../firebaseConfig';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  initialTitle?: string;
  initialDescription?: string;
  subjectId?: string;
  subjectIdNumber?: number;
  onEditMCQs?: (newTitle: string, subjectId: number) => Promise<void>;
}

export default function SubjectModal({ isOpen, onClose, onSave, initialTitle = '', initialDescription = '', subjectId, subjectIdNumber, onEditMCQs }: SubjectModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  // Reset form when modal opens/closes or initial values change
  useEffect(() => {
    setTitle(initialTitle);
    setDescription(initialDescription);
  }, [isOpen, initialTitle, initialDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a subject title');
      return;
    }
    try {
      if (subjectId) {
        // Edit mode: update subject
        const { doc, updateDoc } = await import('firebase/firestore');
        const subjectRef = doc(db, 'mcqsubjects', subjectId);
        await updateDoc(subjectRef, {
          title,
          description,
          lastUpdated: new Date(),
        });
        if (onEditMCQs && subjectIdNumber) {
          await onEditMCQs(title, subjectIdNumber);
        }
      } else {
        // Add mode: create new subject
        const subjectId = Date.now();
        const subjectData = {
          title,
          description,
          active: true,
          revised: false,
          subjectId,
          createdAt: new Date(),
          lastUpdated: new Date()
        };
        await addDoc(collection(db, 'mcqsubjects'), subjectData);
      }
      onSave();
      onClose();
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Error saving subject:', error);
      alert('Failed to save subject');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{subjectId ? 'Edit Subject' : 'Add New Subject'}</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-gray-800"
            placeholder="Subject Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          
          <textarea
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 text-gray-800"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

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
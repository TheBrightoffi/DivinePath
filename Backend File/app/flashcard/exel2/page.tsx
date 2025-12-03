'use client';

import { useState } from 'react';

interface Flashcard {
  title: string;
  description: string;
}

export default function Excel2Page() {
  const [inputText, setInputText] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);

  const processText = () => {
    const lines = inputText.split('\n').filter(line => line.trim());
    const newFlashcards: Flashcard[] = [];
    
    for (let i = 0; i < lines.length; i += 2) {
      if (i + 1 < lines.length) {
        newFlashcards.push({
          title: lines[i].trim(),
          description: lines[i + 1].trim()
        });
      }
    }
    
    setFlashcards(newFlashcards);
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Title', 'Description'],
      ...flashcards.map(fc => [fc.title, fc.description])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'flashcards.csv';
    link.click();
  };

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Flashcard Input</h2>
        <div className="space-y-4">
          <textarea
            placeholder="Enter your text here. First line should be the title, second line the description, and so on..."
            value={inputText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputText(e.target.value)}
            className="w-full p-3 border rounded-lg min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={processText}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Process Text
          </button>
        </div>
      </div>

      {flashcards.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Generated Flashcards</h2>
            <button
              onClick={exportToCSV}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export to CSV
            </button>
          </div>
          <div className="space-y-4">
            {flashcards.map((flashcard, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{flashcard.title}</h3>
                <p className="text-gray-600">{flashcard.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

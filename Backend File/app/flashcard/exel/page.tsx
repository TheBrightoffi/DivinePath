"use client";

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../../../firebaseConfig';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

interface ExcelData {
  subject: string;
  chapter: string;
  title: string;
  description: string;
}

export default function ExcelUploadPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const processExcelData = async (data: ExcelData[]) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Track statistics
      let added = 0;
      const failed: string[] = [];

      // Create maps to store subject and chapter IDs
      const subjectsMap = new Map<string, string>();
      const chaptersMap = new Map<string, string>();

      // Get the last card number
      const flashcardsRef = collection(db, 'flashcards');
      const q = query(flashcardsRef, orderBy('card_no', 'desc'), limit(1));
      const lastCardSnapshot = await getDocs(q);
      let lastCardNo = 0;
      if (!lastCardSnapshot.empty) {
        lastCardNo = lastCardSnapshot.docs[0].data().card_no || 0;
      }

      // Process each unique subject
      for (const row of data) {
        if (!row.subject?.trim()) {
          failed.push(`Row with title: "${row.title}" - Missing subject`);
          continue;
        }

        if (!subjectsMap.has(row.subject)) {
          // Check if subject already exists
          const subjectQuery = query(
            collection(db, 'subjects'),
            where('subject_name', '==', row.subject.trim())
          );
          const subjectDocs = await getDocs(subjectQuery);
          
          if (!subjectDocs.empty) {
            // Use existing subject ID
            subjectsMap.set(row.subject, subjectDocs.docs[0].id);
          } else {
            // Create new subject
            const newSubject = await addDoc(collection(db, 'subjects'), {
              subject_name: row.subject.trim(),
              active: true,
              revised: new Date()
            });
            subjectsMap.set(row.subject, newSubject.id);
          }
        }

        // Process each unique chapter for the subject
        if (!row.chapter?.trim()) {
          failed.push(`Row with title: "${row.title}" - Missing chapter`);
          continue;
        }

        const chapterKey = `${row.subject}-${row.chapter}`;
        if (!chaptersMap.has(chapterKey)) {
          // Check if chapter already exists
          const chapterQuery = query(
            collection(db, 'chapters'),
            where('subject_id', '==', subjectsMap.get(row.subject)),
            where('chapter_name', '==', row.chapter.trim())
          );
          const chapterDocs = await getDocs(chapterQuery);
          
          if (!chapterDocs.empty) {
            // Use existing chapter ID
            chaptersMap.set(chapterKey, chapterDocs.docs[0].id);
          } else {
            // Create new chapter
            const newChapter = await addDoc(collection(db, 'chapters'), {
              subject_id: subjectsMap.get(row.subject),
              chapter_name: row.chapter.trim(),
              priority: 1,
              revised: new Date()
            });
            chaptersMap.set(chapterKey, newChapter.id);
          }
        }

        // Add flashcard
        try {
          lastCardNo++; // Increment card number
          await addDoc(collection(db, 'flashcards'), {
            card_no: lastCardNo,
            chapter_id: chaptersMap.get(chapterKey),
            description: row.description?.trim() || '',
            favorite: false, // Always set to false
            subject_id: subjectsMap.get(row.subject),
            timestamp: new Date(), // Current timestamp
            title: row.title?.trim() || ''
          });

          added++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          failed.push(`Row with title: "${row.title}" - ${errorMessage}`);
        }
      }

      setSuccess(`Successfully added ${added} flashcards. ${failed.length > 0 ? `Failed: ${failed.length}` : ''}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError('Failed to process Excel file: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelData[];

        if (jsonData.length === 0) {
          setError('No data found in Excel file');
          return;
        }

        await processExcelData(jsonData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError('Failed to read Excel file: ' + errorMessage);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadSampleExcel = () => {
    const sampleData = [
      {
        subject: 'History',
        chapter: 'Modern India',
        title: 'Charter Act of 1853',
        description: 'Added 6 new Legislative Councillors to Gov-Gen Council...'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Flashcards');
    XLSX.writeFile(wb, 'flashcards_sample.xlsx');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Excel Upload - Flashcards</h1>

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">Instructions</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
              <li>Prepare your Excel file with columns: subject, chapter, front, back, priority (optional)</li>
              <li>Make sure all required fields are filled</li>
              <li>Priority should be a number between 1-5 (default: 1)</li>
              <li>New subjects and chapters will be created automatically if they don't exist</li>
            </ul>
          </div>

          <div className="mb-8">
            <button
              onClick={downloadSampleExcel}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              Download Sample Excel
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={loading}
            />

            {loading && (
              <div className="text-blue-600">
                Processing... Please wait...
              </div>
            )}

            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 bg-green-50 p-3 rounded-lg">
                {success}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
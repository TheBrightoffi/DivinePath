"use client";

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../../../firebaseConfig';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

interface ExcelMCQ {
  subject: string;
  chapter: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  answer: string;
  explanation?: string;
}

export default function ExcelUploadPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const downloadTemplate = () => {
    const template = [
      {
        subject: 'Sample Subject',
        question: 'Sample Question',
    chapter: 'Sample Chapter',
    option1: 'Option A',
    option2: 'Option B',
    option3: 'Option C',
    option4: 'Option D',
    answer: 'a',
    explanation: 'Optional explanation'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MCQs');
    XLSX.writeFile(wb, 'mcq_template.xlsx');
  };

  const processExcelFile = async (file: File) => {
    setUploading(true);
    setProgress('Reading Excel file...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelMCQ[];

      setProgress('Validating data...');
      const validationErrors: string[] = [];
      const validData = jsonData.filter((row, index) => {
        if (!row.subject?.trim()) {
          validationErrors.push(`Row ${index + 2}: Missing subject`);
          return false;
        }
        if (!row.question?.trim()) {
          validationErrors.push(`Row ${index + 2}: Missing question`);
          return false;
        }
          if (!row.chapter?.trim()) {
            validationErrors.push(`Row ${index + 2}: Missing chapter`);
            return false;
          }
        if (!row.option1?.trim() || !row.option2?.trim() || 
            !row.option3?.trim() || !row.option4?.trim()) {
          validationErrors.push(`Row ${index + 2}: Missing options`);
          return false;
        }
        if (!row.answer?.trim() || !['a', 'b', 'c', 'd'].includes(row.answer.toLowerCase())) {
          validationErrors.push(`Row ${index + 2}: Invalid answer (must be a, b, c, or d)`);
          return false;
        }
        return true;
      });

      if (validationErrors.length > 0) {
        alert('Validation errors found:\n\n' + validationErrors.join('\n'));
        setUploading(false);
        return;
      }

      setProgress('Processing subjects and chapters...');
      const subjectsMap = new Map<string, { subjectId: number, id: string }>();
  const chaptersMap = new Map<string, { id: string, subjectId: string, chapterId: string }>();
      // Process each unique subject
      for (const row of validData) {
        if (!subjectsMap.has(row.subject)) {
          // Check if subject already exists in Firestore
          const subjectsRef = collection(db, 'mcqsubjects');
          const q = query(subjectsRef, where('title', '==', row.subject));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            // Use existing subject's subjectId and id
            const existingSubject = querySnapshot.docs[0].data();
            subjectsMap.set(row.subject, { subjectId: existingSubject.subjectId, id: querySnapshot.docs[0].id });
          } else {
            // Create new subject with new subjectId
            const subjectId = Date.now();
            const subjectData = {
              title: row.subject,
              description: `Imported from Excel on ${new Date().toLocaleString()}`,
              active: true,
              revised: false,
              subjectId,
              createdAt: new Date(),
              lastUpdated: new Date()
            };
            const docRef = await addDoc(subjectsRef, subjectData);
            subjectsMap.set(row.subject, { subjectId, id: docRef.id });
          }
        }
      }

      // Process each unique chapter per subject
      for (const row of validData) {
        const subjectInfo = subjectsMap.get(row.subject);
        if (!subjectInfo) continue;
        const chapterKey = `${row.subject}||${row.chapter}`;
        if (!chaptersMap.has(chapterKey)) {
          // Check if chapter already exists for this subject
          const chaptersRef = collection(db, 'mcqchapters');
          const q = query(chaptersRef, where('title', '==', row.chapter), where('subjectId', '==', subjectInfo.subjectId));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const existingChapter = querySnapshot.docs[0].data();
            chaptersMap.set(chapterKey, { id: querySnapshot.docs[0].id, subjectId: String(subjectInfo.subjectId), chapterId: String(existingChapter.chapterId) });
          } else {
            // Create new chapter
            const chapterId = Date.now();
            const chapterData = {
              title: row.chapter,
              description: `Imported from Excel on ${new Date().toLocaleString()}`,
              subjectId: subjectInfo.subjectId,
              chapterId,
              createdAt: new Date()
            };
            const docRef = await addDoc(chaptersRef, chapterData);
            chaptersMap.set(chapterKey, { id: docRef.id, subjectId: String(subjectInfo.subjectId), chapterId: String(chapterId) });
          }
        }
      }

      setProgress('Uploading MCQs...');
      const mcqsRef = collection(db, 'mcqs');
      // Upload MCQs
      for (const row of validData) {
        const subjectInfo = subjectsMap.get(row.subject);
        const chapterKey = `${row.subject}||${row.chapter}`;
        const chapterInfo = chaptersMap.get(chapterKey);
        if (!subjectInfo || !chapterInfo) continue;
        const mcqData = {
          chapterId: chapterInfo.chapterId,
          question: row.question,
          option1: row.option1,
          option2: row.option2,
          option3: row.option3,
          option4: row.option4,
          answer: row.answer.toLowerCase(),
          explanation: row.explanation || '',
          createdAt: new Date(),
          lastUpdated: new Date()
        };
        await addDoc(mcqsRef, mcqData);
      }

      setProgress('');
      alert('Upload completed successfully!');
    } catch (error) {
      console.error('Error processing Excel file:', error);
      alert('Error processing Excel file. Please check the console for details.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Excel MCQ Upload</h1>
        
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Download Template</h2>
          <p className="text-gray-600 mb-4">
            Download the Excel template to see the required format for MCQ upload.
          </p>
          <button
            onClick={downloadTemplate}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Download Template
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload MCQs</h2>
          <p className="text-gray-600 mb-4">
            Upload your Excel file containing MCQs. Make sure to follow the template format.
          </p>
          
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                processExcelFile(file);
              }
            }}
            className="block w-full text-sm text-gray-500 mb-4
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          
          {uploading && (
            <div className="mt-4">
              <div className="animate-pulse bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                {progress}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
"use client";

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../../../firebaseConfig';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

interface ExcelSyllabus {
  subject_name: string;
  topic_name: string;
  syllabus_topic_name: string;
}

export default function SyllabusExcelUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const downloadTemplate = () => {
    const template = [
      {
        subject_name: 'Sample Subject',
        topic_name: 'Sample Topic',
        syllabus_topic_name: 'Sample Syllabus Topic'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Syllabus');
    XLSX.writeFile(wb, 'syllabus_template.xlsx');
  };

  const processExcelFile = async (file: File) => {
    setUploading(true);
    setProgress('Reading Excel file...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelSyllabus[];

      setProgress('Validating data...');
      const validationErrors: string[] = [];
      const validData = jsonData.filter((row, index) => {
        if (!row.subject_name?.trim()) {
          validationErrors.push(`Row ${index + 2}: Missing subject name`);
          return false;
        }
        if (!row.topic_name?.trim()) {
          validationErrors.push(`Row ${index + 2}: Missing topic name`);
          return false;
        }
        if (!row.syllabus_topic_name?.trim()) {
          validationErrors.push(`Row ${index + 2}: Missing syllabus topic name`);
          return false;
        }
        return true;
      });

      if (validationErrors.length > 0) {
        alert('Validation errors found:\n\n' + validationErrors.join('\n'));
        setUploading(false);
        return;
      }

      setProgress('Processing subjects...');
      const subjectsMap = new Map<string, string>();

      // Process each unique subject
      for (const row of validData) {
        if (!subjectsMap.has(row.subject_name)) {
          const subjectsRef = collection(db, 'syllabus_subject');
          const q = query(subjectsRef, where('subject_name', '==', row.subject_name));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            subjectsMap.set(row.subject_name, querySnapshot.docs[0].id);
          } else {
            const docRef = await addDoc(subjectsRef, {
              subject_name: row.subject_name
            });
            subjectsMap.set(row.subject_name, docRef.id);
          }
        }
      }

      setProgress('Processing topics...');
      const topicsMap = new Map<string, string>();

      // Process topics
      for (const row of validData) {
        const topicKey = `${row.subject_name}-${row.topic_name}`;
        if (!topicsMap.has(topicKey)) {
          const topicsRef = collection(db, 'syllabus_topic');
          const q = query(
            topicsRef,
            where('subject_id', '==', subjectsMap.get(row.subject_name)),
            where('topic_name', '==', row.topic_name)
          );
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            topicsMap.set(topicKey, querySnapshot.docs[0].id);
          } else {
            const docRef = await addDoc(topicsRef, {
              subject_id: subjectsMap.get(row.subject_name),
              topic_name: row.topic_name
            });
            topicsMap.set(topicKey, docRef.id);
          }
        }
      }

      setProgress('Adding syllabus items...');
      const syllabusRef = collection(db, 'syllabus');

      // Add syllabus items
      for (const row of validData) {
        const topicKey = `${row.subject_name}-${row.topic_name}`;
        await addDoc(syllabusRef, {
          topic_id: topicsMap.get(topicKey),
          topic_name: row.syllabus_topic_name,
          completed: false
        });
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
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Excel Syllabus Upload</h1>

        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Download Template</h2>
          <p className="text-gray-600 mb-4">
            Download the Excel template to see the required format for syllabus data upload.
          </p>
          <button
            onClick={downloadTemplate}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
          >
            Download Template
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Syllabus Data</h2>
          <p className="text-gray-600 mb-4">
            Upload your Excel file containing syllabus data. Make sure to follow the template format.
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
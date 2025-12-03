"use client";

import { useState, useEffect } from "react";
import SubjectModal from "./components/SubjectModal";
import MCQModal from "./components/MCQModal";
import MCQChapterModal from "./components/MCQChapterModal";
import { db } from "../../firebaseConfig";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import React from "react";

export interface MCQSubject {
  id: string;
  title: string;
  description: string;
  active: boolean;
  revised: boolean;
  subjectId: number;
}

interface MCQ {
  id: string;
  mcqsubject_id: string;
  chapterId?: string;
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  answer: string;
  explanation: string;
}

export default function MCQPage() {
  const [subjects, setSubjects] = useState<MCQSubject[]>([]);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [mcqChapters, setMcqChapters] = useState<any[]>([]);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [mcqModalVisible, setMcqModalVisible] = useState(false);
  const [mcqChapterModalVisible, setMcqChapterModalVisible] = useState(false);
  const [editSubject, setEditSubject] = useState<MCQSubject | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [checkedChapters, setCheckedChapters] = useState<string[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  // Load subjects
  const loadSubjects = async () => {
    try {
      const subjectsRef = collection(db, "mcqsubjects");
      const q = query(subjectsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const subjectsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MCQSubject[];
      setSubjects(subjectsData);
    } catch (error) {
      console.error("Error loading subjects:", error);
    }
  };

  // Load MCQs
  const loadMcqs = async () => {
    try {
  const mcqsRef = collection(db, "mcqs");
  const q = query(mcqsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const mcqsData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          chapterId: data.chapterId || data.sqliteId || ""
        };
      }) as MCQ[];
      setMcqs(mcqsData);
    } catch (error) {
      console.error("Error loading MCQs:", error);
    }
  };

  // Load Chapters
  const loadMcqChapters = async () => {
    try {
      const chaptersRef = collection(db, "mcqchapters");
      const q = query(chaptersRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const chaptersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMcqChapters(chaptersData);
    } catch (error) {
      console.error("Error loading MCQ chapters:", error);
    }
  };

  // Delete subject + its MCQs
  const handleDeleteSubject = async (subjectId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this subject and all its MCQs?"
      )
    )
      return;
    try {
      await deleteDoc(doc(db, "mcqsubjects", subjectId));
      const mcqsRef = collection(db, "mcqs");
      const q = query(mcqsRef, where("mcqsubject_id", "==", subjectId));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      await loadSubjects();
      await loadMcqs();
    } catch (error) {
      console.error("Error deleting subject and MCQs:", error);
    }
  };

  // Update subject name in MCQs
  const handleEditMCQs = async (newTitle: string, subjectId: number) => {
    try {
      const mcqsRef = collection(db, "mcqs");
      const q = query(mcqsRef, where("mcqsubject_id", "==", subjectId));
      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map((docSnap) =>
        updateDoc(docSnap.ref, { subject_name: newTitle })
      );
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error updating MCQs with new subject name:", error);
    }
  };

  useEffect(() => {
    loadSubjects();
    loadMcqs();
    loadMcqChapters();
  }, []);

  // Export all subjects and their MCQs to Excel
  const handleExportAllSubjectsExcel = () => {
    const wb = XLSX.utils.book_new();
    subjects.forEach((subject) => {
  const subjectMcqs = mcqs.filter((mcq) => mcq.mcqsubject_id === subject.id || mcq.mcqsubject_id === String(subject.subjectId));
      const data = subjectMcqs.map((mcq) => ({
        Subject: subject.title,
        Question: mcq.question,
        OptionA: mcq.option1,
        OptionB: mcq.option2,
        OptionC: mcq.option3,
        OptionD: mcq.option4,
        Answer: mcq.answer,
        Explanation: mcq.explanation,
      }));
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, sheet, subject.title.substring(0, 31));
    });
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "all_subjects_mcqs.xlsx");
  };
   // Handle chapter checkbox change
  const handleChapterCheck = (chapterId: string, checked: boolean) => {
    setCheckedChapters((prev: string[]) =>
      checked ? [...prev, chapterId] : prev.filter((id: string) => id !== chapterId)
    );
  };

   // Export checked chapters' subjects' MCQs to Excel
   const handleExportCheckedChaptersExcel = () => {
     const wb = XLSX.utils.book_new();
     // Find checked subjects
     const selectedSubjects = subjects.filter((subject: MCQSubject) => checkedChapters.includes(subject.id));
     let hasData = false;
     selectedSubjects.forEach((subject: MCQSubject) => {
  const subjectMcqs = mcqs.filter((mcq: MCQ) => mcq.mcqsubject_id.toString() === subject.id || mcq.mcqsubject_id.toString() === String(subject.subjectId));
       if (subjectMcqs.length > 0) {
         hasData = true;
         const data = subjectMcqs.map((mcq: MCQ) => ({
           Subject: subject.title,
           Question: mcq.question,
           OptionA: mcq.option1,
           OptionB: mcq.option2,
           OptionC: mcq.option3,
           OptionD: mcq.option4,
           Answer: mcq.answer,
           Explanation: mcq.explanation,
         }));
         const sheet = XLSX.utils.json_to_sheet(data);
         XLSX.utils.book_append_sheet(wb, sheet, subject.title.substring(0, 31));
       }
     });
     if (!hasData) {
       alert("No MCQs found for the selected subjects.");
       return;
     }
     const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
     let filename = "checked_subjects_mcqs.xlsx";
     if (selectedSubjects.length === 1) {
       filename = `${selectedSubjects[0].title.replace(/[^a-zA-Z0-9]/g, "_")}_mcqs.xlsx`;
     }
     saveAs(new Blob([wbout], { type: "application/octet-stream" }), filename);
   };
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white px-6 py-4 shadow-md">
        <h1 className="text-2xl font-bold text-gray-800">MCQ Management</h1>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mb-8">
          <button
            onClick={handleExportAllSubjectsExcel}
            className="bg-gradient-to-r from-blue-700 to-blue-900 px-4 py-2.5 rounded-full shadow-sm text-white"
          >
            Export All Subjects' MCQs to Excel
          </button>
          <button
            onClick={() => loadSubjects()}
            disabled={isSyncing}
            className={`flex items-center bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 rounded-full shadow-sm text-white ${
              isSyncing ? "opacity-50" : ""
            }`}
          >
            {isSyncing && <div className="mr-2 animate-spin">⌛</div>}
            Sync Data
          </button>
          <a
            href="/mcq/excel"
            className="bg-gradient-to-r from-purple-500 to-purple-600 px-4 py-2.5 rounded-full shadow-sm text-white"
          >
            Excel Upload
          </a>
          <button
            onClick={() => setSubjectModalVisible(true)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 rounded-full shadow-sm text-white"
          >
            Add Subject
          </button>
          <button
            onClick={() => setMcqChapterModalVisible(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-2.5 rounded-full shadow-sm text-white"
          >
            Add MCQ Chapter
          </button>
        </div>

        {/* Subjects List */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Subjects</h2>
            <button
              onClick={handleExportCheckedChaptersExcel}
              disabled={checkedChapters.length === 0}
              className={`mb-4 px-6 py-3 rounded-xl bg-blue-700 text-white font-semibold shadow ${checkedChapters.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Download Checked Subjects' Data
            </button>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-start cursor-pointer"
                  onClick={() => setSelectedSubjectId(subject.id)}
                >
                  <input
                    type="checkbox"
                    className="mr-3 mt-1"
                    checked={checkedChapters.includes(subject.id)}
                    onChange={(e) => handleChapterCheck(subject.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{subject.title}</h3>
                    <p className="text-gray-600 mb-3">{subject.description}</p>
                    <div className="flex space-x-4 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full ${
                          subject.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {subject.active ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full ${
                          subject.revised
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {subject.revised ? "Revised" : "Not Revised"}
                      </span>
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditSubject(subject); }}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded-full text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        {/* MCQ Chapters List */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">MCQ Chapters</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {mcqChapters
                .filter((chapter) => !selectedSubjectId || chapter.subjectId === selectedSubjectId)
                .map((chapter) => (
                  <div
                    key={chapter.id}
                    className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer ${selectedChapterId === chapter.chapterId ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setSelectedChapterId(chapter.chapterId)}
                  >
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {chapter.title}
                    </h3>
                    <p className="text-gray-600 mb-3">{chapter.description}</p>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                      Created:{" "}
                      {chapter.createdAt?.toDate?.()
                        ? chapter.createdAt.toDate().toLocaleString()
                        : ""}
                    </span>
                  </div>
                ))}
            </div>
          </div>

        {/* MCQs List */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">MCQs</h2>
          <button
            onClick={() => setMcqModalVisible(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-2.5 rounded-full shadow-sm text-white font-semibold"
          >
            Add MCQ
          </button>
        </div>
        <div className="space-y-3">
          {mcqs
            .filter((mcq) => selectedChapterId ? mcq.chapterId === selectedChapterId : false)
            .map((mcq) => (
              <div
                key={mcq.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  {mcq.question}
                </h3>
                <div className="space-y-2 mb-3">
                  {["option1", "option2", "option3", "option4"].map(
                    (opt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center space-x-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-700 font-semibold">
                            {String.fromCharCode(65 + idx)}
                          </span>
                        </div>
                        <p className="text-gray-700 flex-1">
                          {mcq[opt as keyof MCQ]}
                        </p>
                      </div>
                    )
                  )}
                </div>
                <div className="flex items-center mt-2">
                  <span className="bg-green-100 px-3 py-1 rounded-full text-green-700 font-medium">
                    Answer: {mcq.answer.toUpperCase()}
                  </span>
                  {mcq.explanation && (
                    <p className="text-gray-500 ml-3 flex-1">{mcq.explanation}</p>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Modals */}
        {subjectModalVisible && (
          <SubjectModal
            isOpen={subjectModalVisible}
            onClose={() => setSubjectModalVisible(false)}
            onSave={loadSubjects}
          />
        )}
        {mcqModalVisible && (
          <MCQModal
            isOpen={mcqModalVisible}
            onClose={() => setMcqModalVisible(false)}
            subjects={subjects}
            onSave={loadMcqs}
          />
        )}
        {editSubject && (
          <SubjectModal
            isOpen={!!editSubject}
            onClose={() => setEditSubject(null)}
            onSave={() => {
              loadSubjects();
              loadMcqs();
            }}
            initialTitle={editSubject.title}
            initialDescription={editSubject.description}
            subjectId={editSubject.id}
            subjectIdNumber={editSubject.subjectId}
            onEditMCQs={handleEditMCQs}
          />
        )}
        {mcqChapterModalVisible && (
          <MCQChapterModal
            isOpen={mcqChapterModalVisible}
            onClose={() => setMcqChapterModalVisible(false)}
            onSave={loadMcqChapters}
            subjects={subjects}
          />
        )}
      </div>
    </div>
  );
}

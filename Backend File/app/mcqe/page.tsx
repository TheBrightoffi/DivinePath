"use client";
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const Home = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');

  // Parse a single question from the raw input text
  const parseQuestion = (text: string) => {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 5) {
      return null;
    }

    const numberMatch = lines[0].match(/^(\d+)\.\s*(.*)/);
    if (!numberMatch) {
      return null;
    }

    const no = parseInt(numberMatch[1]);
    const question = numberMatch[2];
    const a = lines[1].replace(/^\(a\)\s*/, '');
    const b = lines[2].replace(/^\(b\)\s*/, '');
    const c = lines[3].replace(/^\(c\)\s*/, '');
    const d = lines[4].replace(/^\(d\)\s*/, '');

    return { no, question, a, b, c, d };
  };

  // Parse all the questions from the raw input
  const parseAllQuestions = (input: string) => {
    const questionTexts = input.trim().split('\n\n'); // Split by empty line between questions
    const parsedQuestions = questionTexts.map(parseQuestion).filter(Boolean);
    return parsedQuestions;
  };

  // Parse answer input and map answers to questions by number
  const parseAnswers = (input: string) => {
    const answers = input.trim().split('\n');
    const answerMap: { [key: number]: string } = {};
    answers.forEach((line) => {
      const [questionNo, answer] = line.split(/\s+/);
      answerMap[parseInt(questionNo)] = answer.toLowerCase();
    });
    return answerMap;
  };

  const handleAdd = () => {
    const parsedQuestions = parseAllQuestions(rawInput);
    const parsedAnswers = parseAnswers(answerInput);

    const questionsWithAnswers = parsedQuestions.map((question) => {
      return {
        ...question,
        answer: parsedAnswers[question.no] || '',
      };
    });

    setQuestions([...questions, ...questionsWithAnswers]);
    setRawInput('');
    setAnswerInput('');
  };

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(questions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MCQs');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const fileData = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(fileData, 'mcqs.xlsx');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Add Multiple MCQs and Export with Answers</h1>

      <textarea
        rows={10}
        className="w-full p-3 border rounded mb-4"
        placeholder="Paste multiple MCQs including options (a), (b), (c), (d)..."
        value={rawInput}
        onChange={(e) => setRawInput(e.target.value)}
      />

      <textarea
        rows={5}
        className="w-full p-3 border rounded mb-4"
        placeholder="Enter answers (e.g., 1. c, 2. b, 3. d)"
        value={answerInput}
        onChange={(e) => setAnswerInput(e.target.value)}
      />

      <button
        onClick={handleAdd}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
      >
        Add Questions
      </button>

      {questions.length > 0 && (
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export to Excel
        </button>
      )}

      {questions.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Added Questions:</h2>
          <ul className="list-disc ml-6">
            {questions.map((q, i) => (
              <li key={i}>
                <strong>{q.no}.</strong> {q.question} (Answer: {q.answer.toUpperCase()})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Home;

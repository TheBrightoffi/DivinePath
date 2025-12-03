"use client";
import { useState } from "react";
// @ts-ignore
import * as XLSX from "xlsx";

export default function Home() {
  const [subject, setSubject] = useState("Geography class 11");
  const [chapter, setChapter] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [error, setError] = useState("");

  function parseBlock(block: string) {
    const lines = block.split("\n").map((l: string) => l.trim()).filter(Boolean);
    if (lines.length < 6) return null;
    const optionIndex = lines.findIndex((l: string) => l.match(/^a\)/i));
    if (optionIndex === -1 || optionIndex < 1) return null;
    const question = lines.slice(0, optionIndex).join(" ");
    const options = [0,1,2,3].map(i => {
      const line = lines[optionIndex + i] || "";
      const match = line.match(/^[a-d]\)\s*(.*)$/i);
      return match ? match[1] : "";
    });
    const answerLine = lines.find((l: string) => l.toLowerCase().startsWith("answer:"));
    if (!answerLine) return null;
    const answerMatch = answerLine.match(/answer:\s*([a-d])/i);
    if (!answerMatch) return null;
    const answer = answerMatch[1].toLowerCase();
    return { question, options, answer };
  }

  function parseMultipleQuestions(input: string) {
    // Split by two or more newlines (blank lines)
    const blocks = input.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
    return blocks.map(parseBlock).filter(Boolean);
  }

  function handleDownload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!subject.trim() || !chapter.trim()) {
      setError("Please provide both subject and chapter name.");
      return;
    }
    const parsedQuestions = parseMultipleQuestions(questionText).filter((q): q is { question: string; options: string[]; answer: string } => q !== null);
    if (!parsedQuestions.length) {
      setError("Please provide at least one valid question in the correct format.");
      return;
    }
    const rows = parsedQuestions.map(q => [subject, q.question, chapter, ...q.options, q.answer, ""]);
    const ws = XLSX.utils.aoa_to_sheet([
      ["subject", "question", "chapter", "option1", "option2", "option3", "option4", "answer", "explanation"],
      ...rows
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const fileName = chapter.trim() ? `${chapter.trim().replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx` : "questions.xlsx";
    XLSX.writeFile(wb, fileName);
  }

  function handleClear() {
    setSubject("");
    setChapter("");
    setQuestionText("");
    setError("");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <form onSubmit={handleDownload} className="bg-white p-6 rounded shadow-md w-full max-w-lg flex flex-col gap-4">
        <h1 className="text-xl font-bold mb-2">Excel Question Generator</h1>
        <p className="text-sm text-gray-600 mb-2">
          Enter the subject and chapter name, then paste <b>one or more questions</b> in the following format, separated by blank lines:<br/>
          <span className="font-mono text-xs block bg-gray-100 p-2 rounded mt-2">
            Which country's Constitution inspired India's amendment procedure?<br/>
            a) USA<br/>
            b) Canada<br/>
            c) South Africa<br/>
            d) France<br/>
            Answer: c<br/>
            <br/>
            An amendment by simple majority is treated as:<br/>
            a) A constitutional amendment under Article 368<br/>
            b) An ordinary law<br/>
            c) An administrative order<br/>
            d) A presidential directive<br/>
            Answer: b
          </span>
        </p>
        <input
          type="text"
          className="border p-2 rounded text-black"
          placeholder="Subject Name"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          required
        />
        <input
          type="text"
          className="border p-2 rounded text-black"
          placeholder="Chapter Name"
          value={chapter}
          onChange={e => setChapter(e.target.value)}
          required
        />
        <textarea
          className="border p-2 rounded h-40 font-mono text-black"
          placeholder={`Paste your questions here... (separate each question by a blank line)`}
          value={questionText}
          onChange={e => setQuestionText(e.target.value)}
          required
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="flex gap-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Download Excel
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

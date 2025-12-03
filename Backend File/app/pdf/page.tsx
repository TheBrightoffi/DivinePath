'use client'

import { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';

interface Content {
  id: string;
  title: string;
  url: string;
}

export default function ContentForm() {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    // Set up real-time listener for content changes
    const unsubscribe = onSnapshot(collection(db, 'pdf'), (snapshot) => {
      const contentList: Content[] = [];
      snapshot.forEach((doc) => {
        contentList.push({ id: doc.id, ...doc.data() } as Content);
      });
      setContents(contentList);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!title || !url) {
      setError('Please enter both title and URL');
      return;
    }

    try {
      setLoading(true);
      
      if (editingId) {
        // Update existing document
        await updateDoc(doc(db, 'pdf', editingId), {
          title,
          url
        });
      } else {
        // Add new document
        await addDoc(collection(db, 'pdf'), {
          title,
          url
        });
      }

      setTitle('');
      setUrl('');
      setEditingId(null);
      setError(null);
      alert(editingId ? 'Content updated successfully!' : 'Content added successfully!');
    } catch (error) {
      console.error('Firestore error:', error);
      setError('Failed to save information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (content: Content) => {
    setTitle(content.title);
    setUrl(content.url);
    setEditingId(content.id);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'pdf', id));
        alert('Content deleted successfully!');
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete content. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    setTitle('');
    setUrl('');
    setEditingId(null);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-6">{editingId ? 'Edit Content' : 'Add Content'}</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter content title"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 mb-2">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter URL"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : editingId ? 'Update Content' : 'Save Content'}
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Content List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">URL</th>
                <th className="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contents.map((content) => (
                <tr key={content.id} className="border-b">
                  <td className="px-4 py-2">{content.title}</td>
                  <td className="px-4 py-2">
                    <a href={content.url} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-500 hover:text-blue-700 underline">
                      {content.url}
                    </a>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => handleEdit(content)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded mr-2 hover:bg-yellow-600 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(content.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {contents.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-gray-500">
                    No content available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
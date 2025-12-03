import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, Modal, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import * as SQLite from 'expo-sqlite';

interface SQLiteCallback {
  (error: Error | null): void;
}

interface SQLResultSet {
  rows: {
    _array: any[];
    length: number;
    item(index: number): any;
  };
}

const db = SQLite.openDatabaseSync('mainapp.db');

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface SwipeableNoteProps {
  note: Note;
  onDelete: (id: string) => void;
  onEdit: (note: Note) => void;
}

const SwipeableNote: React.FC<SwipeableNoteProps> = ({ note, onDelete, onEdit }) => {
  const renderRightActions = () => {
    return (
      <View className="flex justify-center items-center bg-red-500 w-24">
        <Text className="text-white font-montserrat-bold">Delete</Text>
      </View>
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(note.id) }
      ]
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      rightThreshold={40}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          handleDelete();
        }
      }}
    >
      <TouchableOpacity
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
        onPress={() => onEdit(note)}
      >
        <Text className="text-lg font-montserrat-bold text-gray-800 mb-1">{note.title}</Text>
        <Text className="text-base font-montserrat text-gray-600 mb-2">{note.content}</Text>
        <Text className="text-xs font-montserrat-light text-gray-400">{formatDate(note.createdAt)}</Text>
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function AddNote() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentNote, setCurrentNote] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stmt = db.prepareSync('CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT, content TEXT, createdAt TEXT);');
    try {
      stmt.executeSync();
      console.log('Notes table created successfully');
      loadNotes();
    } catch (error) {
      console.error('Error creating notes table:', error);
    } finally {
      stmt.finalizeSync();
    }
  }, []);

  const loadNotes = () => {
    const stmt = db.prepareSync('SELECT * FROM notes ORDER BY createdAt DESC;');
    try {
      const results = stmt.executeSync<Note>();
      const rows = results.getAllSync();
      setNotes(rows);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const saveNote = () => {
    if (currentNote.trim() && currentTitle.trim()) {
      try {
        if (editingNote) {
          const stmt = db.prepareSync('UPDATE notes SET title = ?, content = ? WHERE id = ?');
          stmt.executeSync([currentTitle, currentNote, editingNote.id]);
          stmt.finalizeSync();
          console.log('Note updated:', currentTitle);
        } else {
          const newNote = {
            id: Date.now().toString(),
            title: currentTitle,
            content: currentNote,
            createdAt: new Date().toISOString(),
          };
          const stmt = db.prepareSync('INSERT INTO notes (id, title, content, createdAt) VALUES (?, ?, ?, ?)');
          stmt.executeSync([newNote.id, newNote.title, newNote.content, newNote.createdAt]);
          stmt.finalizeSync();
          console.log('Note saved:', newNote);
        }
        loadNotes();
        setCurrentNote('');
        setCurrentTitle('');
        setEditingNote(null);
        setModalVisible(false);
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setCurrentTitle(note.title);
    setCurrentNote(note.content);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    try {
      const stmt = db.prepareSync('DELETE FROM notes WHERE id = ?');
      stmt.executeSync([id]);
      stmt.finalizeSync();
      console.log('Note deleted:', id);
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  return (
    <GestureHandlerRootView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="px-6 py-4 bg-slate-100 rounded-md mb-5 m-2  border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-gray-800">Notes</Text>
          <Text className="text-sm text-gray-500 mt-1">Keep track of your important Notes</Text>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={() => {
            setEditingNote(null);
            setCurrentTitle('');
            setCurrentNote('');
            setModalVisible(true);
          }}
          className="bg-blue-600 rounded-full w-12 h-12 items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Text className="text-white text-2xl">+</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 pt-4 pb-20">
        <FlatList
          data={notes}
          renderItem={({ item }) => (
            <SwipeableNote
              note={item}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          )}
          keyExtractor={(item) => item.id}
          className="h-full"
          ListEmptyComponent={
            <View className="flex items-center justify-center pt-20">
              <Text className="font-montserrat text-gray-400 text-lg">No notes yet</Text>
              <Text className="font-montserrat-light text-gray-400">Tap + to create one</Text>
            </View>
          }
        />
      </View>

      {/* <TouchableOpacity
        className="absolute right-6 bottom-6 w-14 h-14 bg-blue-500 rounded-full items-center justify-center shadow-lg"
        onPress={() => {
          setEditingNote(null);
          setCurrentTitle('');
          setCurrentNote('');
          setModalVisible(true);
        }}
      >
        <Text className="text-white text-3xl font-montserrat-bold">+</Text>
      </TouchableOpacity> */}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setEditingNote(null);
          setCurrentTitle('');
          setCurrentNote('');
        }}
      >
        <View className="flex-1 bg-white">
          <View className="p-4 bg-gray-50 border-b border-gray-200">
            <Text className="text-xl font-montserrat-bold text-gray-800">
              {editingNote ? 'Edit Note' : 'New Note'}
            </Text>
          </View>

          <View className="p-4 flex-1">
            <TextInput
              className="bg-gray-50 rounded-lg p-4 text-base font-montserrat mb-3"
              placeholder="Title"
              value={currentTitle}
              onChangeText={setCurrentTitle}
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              className="bg-gray-50 rounded-lg p-4 text-base font-montserrat flex-1"
              multiline
              placeholder="Write your note here..."
              value={currentNote}
              onChangeText={setCurrentNote}
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
            />
          </View>

          <View className="flex-row justify-between p-4 bg-gray-50 border-t border-gray-200">
            <TouchableOpacity
              className="flex-1 mr-2 bg-gray-400 p-4 rounded-lg items-center"
              onPress={() => {
                setModalVisible(false);
                setEditingNote(null);
                setCurrentTitle('');
                setCurrentNote('');
              }}
            >
              <Text className="text-white font-montserrat-bold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 ml-2 bg-blue-500 p-4 rounded-lg items-center"
              onPress={saveNote}
            >
              <Text className="text-white font-montserrat-bold">
                {editingNote ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert,StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('mainapp.db');

interface Manifest {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  today_done: number;
}

const CreateManifest = () => {
  const router = useRouter();
  const [text, setText] = useState('');
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  useEffect(() => {
    // Create table if it doesn't exist
    const stmt = db.prepareSync(`
      CREATE TABLE IF NOT EXISTS manifest (
        id TEXT PRIMARY KEY,
        text TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        today_done INTEGER DEFAULT 0
      );
    `);
    try {
      stmt.executeSync();
    } catch (error) {
      console.error('Error creating table:', error);
    } finally {
      stmt.finalizeSync();
    }
    loadManifests();
  }, []);

  const loadManifests = () => {
    const stmt = db.prepareSync('SELECT * FROM manifest');
    try {
      const results = stmt.executeSync();
      const rows = results.getAllSync() as Manifest[];
      setManifests(rows);
    } catch (error) {
      Alert.alert('Error', 'Failed to load manifests');
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleSubmit = () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter some text');
      return;
    }

    const formattedText = `"${text.trim()}"`;

    try {
      if (editingId) {
        // Edit existing manifest
        const stmt = db.prepareSync(
          'UPDATE manifest SET text = ?, updatedAt = ? WHERE id = ?'
        );
        stmt.executeSync([formattedText, new Date().toISOString(), editingId]);
        stmt.finalizeSync();
      } else {
        // Create new manifest
        const stmt = db.prepareSync(
          'INSERT INTO manifest (id, text, createdAt, updatedAt, today_done) VALUES (?, ?, ?, ?, ?)'
        );
        stmt.executeSync([
          Date.now().toString(),
          formattedText,
          new Date().toISOString(),
          new Date().toISOString(),
          0
        ]);
        stmt.finalizeSync();
      }
      
      setText('');
      setEditingId(null);
      loadManifests();
      Alert.alert('Success', editingId ? 'Manifest updated successfully' : 'Manifest saved successfully');
    } catch (error) {
      Alert.alert('Error', editingId ? 'Failed to update manifest' : 'Failed to save manifest');
    }
  };

  const handleEdit = (manifest: Manifest) => {
    setText(manifest.text);
    setEditingId(manifest.id);
  };

  const handleDelete = (id: string) => {
    try {
      const stmt = db.prepareSync('DELETE FROM manifest WHERE id = ?');
      stmt.executeSync([id]);
      stmt.finalizeSync();
      loadManifests();
      Alert.alert('Success', 'Manifest deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete manifest');
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="px-4 py-6">
        {/* <Text className="text-4xl font-montserrat-bold text-center mb-8 text-gray-800">
          {editingId ? 'Edit Manifest' : 'Create Manifest'}
        </Text> */}
        
        <View className="space-y-6">
          <TextInput
            className="w-full bg-white px-6 py-4 rounded-xl shadow-sm border border-gray-100 font-montserrat text-gray-700"
            value={text}
            onChangeText={(value) => setText(value.slice(0, 100))}
            placeholder="Enter your manifest (100 chars max)"
            maxLength={100}
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity 
               className="flex-1 mt-5 border-2 bg-slate-600  border-slate-500 py-4 rounded-lg shadow-md active:bg-blue-100"
            onPress={handleSubmit}
          >
            <Text className="text-white text-center text-lg font-montserrat-bold">
              {editingId ? 'Update Manifest' : 'Create Manifest'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-4 py-6">
        <Text className="text-2xl font-montserrat-bold mb-6 text-gray-800">Your Manifests</Text>
        {manifests.map((manifest) => (
          <View key={manifest.id} className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-50">
            <Text className="font-montserrat text-gray-700 mb-2">{manifest.text}</Text>
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-gray-400 font-montserrat">
                {new Date(manifest.updatedAt).toLocaleDateString()}
              </Text>
              <View className="flex-row space-x-4">
                <TouchableOpacity 
                  onPress={() => handleEdit(manifest)}
                  className="p-2"
                >
                  <Icon name="edit" size={22} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleDelete(manifest.id)}
                  className="p-2"
                >
                  <Icon name="delete" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default CreateManifest;
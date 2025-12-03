import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert,StatusBar } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useRouter } from 'expo-router';

const db = SQLite.openDatabaseSync('mainapp.db');

interface Analysis {
  id: number;
  subject_name: string;
  what_to_improve: string;
}

export default function WhattoImprove() {
  const router = useRouter();
  const [analysisData, setAnalysisData] = useState<Analysis[]>([]);

  useEffect(() => {
    loadAnalysisData();
  }, []);

  const loadAnalysisData = () => {
    try {
      const stmt = db.prepareSync('SELECT * FROM mcq_analysis ORDER BY id DESC');
      const results = stmt.executeSync<Analysis>();
      const data = results.getAllSync();
      setAnalysisData(data);
      stmt.finalizeSync();
    } catch (error) {
      console.error('Error loading analysis data:', error);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Delete Analysis",
      "Are you sure you want to delete this analysis?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              const stmt = db.prepareSync('DELETE FROM mcq_analysis WHERE id = ?');
              stmt.executeSync([id]);
              stmt.finalizeSync();
              loadAnalysisData(); // Reload the data after deletion
            } catch (error) {
              console.error('Error deleting analysis:', error);
              Alert.alert('Error', 'Failed to delete the analysis');
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ScrollView className="flex-1 px-4 pt-4">
        {analysisData.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20">
            <Text className="text-gray-500 text-lg font-montserrat">
              No analysis data available yet. Complete some MCQ tests to get improvement suggestions.
            </Text>
          </View>
        ) : (
          analysisData.map((analysis) => (
            <View
              key={analysis.id}
              className="bg-white rounded-2xl shadow-sm mb-4 p-6"
            >
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-lg font-semibold text-blue-600 font-montserrat">
                  {analysis.subject_name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(analysis.id)}
                  className="bg-red-500 px-3 py-1 rounded-lg"
                >
                  <Text className="text-white font-montserrat">Delete</Text>
                </TouchableOpacity>
              </View>
              <View className="bg-blue-50 rounded-xl p-4">
                <Text className="text-gray-700 leading-relaxed font-montserrat">
                  {analysis.what_to_improve}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SQLite from 'expo-sqlite';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  editingTask?: {
    id: number;
    taskname: string;
    description: string;
    duedate: string;
    priority: 'low' | 'medium' | 'high';
  } | null;
}

const db = SQLite.openDatabaseSync('mainapp.db');

export default function AddTaskModal({ visible, onClose, editingTask }: AddTaskModalProps) {
  const [taskname, setTaskname] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (editingTask) {
      setTaskname(editingTask.taskname);
      setDescription(editingTask.description);
      setDueDate(new Date(editingTask.duedate));
      setPriority(editingTask.priority as 'low' | 'medium' | 'high');
    } else {
      // Reset form when not editing
      setTaskname('');
      setDescription('');
      setDueDate(new Date());
      setPriority('medium');
    }
  }, [editingTask, visible]);

  const handleSubmit = () => {
    if (!taskname.trim()) return;

    const now = new Date().toISOString();
    
    if (editingTask) {
      // Update existing task
      const stmt = db.prepareSync(
        'UPDATE tasks SET taskname = ?, description = ?, duedate = ?, priority = ?, updated_date = ? WHERE id = ?'
      );
      try {
        stmt.executeSync([
          taskname,
          description,
          dueDate.toISOString(),
          priority,
          now,
          editingTask.id
        ]);
      } catch (error) {
        console.error('Error updating task:', error);
      } finally {
        stmt.finalizeSync();
      }
    } else {
      // Create new task
      const stmt = db.prepareSync(
        'INSERT INTO tasks (taskname, description, duedate, priority, status, created_date, updated_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );
      try {
        stmt.executeSync([
          taskname,
          description,
          dueDate.toISOString(),
          priority,
          'pending',
          now,
          now
        ]);
      } catch (error) {
        console.error('Error saving task:', error);
      } finally {
        stmt.finalizeSync();
      }
    }

    // Reset form and close modal
    setTaskname('');
    setDescription('');
    setDueDate(new Date());
    setPriority('medium');
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View className="flex-1 justify-end bg-black/30">
        <View className="bg-white rounded-t-3xl p-6 shadow-xl">
          <Text className="text-2xl font-bold mb-6 font-montserrat">
            {editingTask ? 'Edit Task' : 'New Task'}
          </Text>
          
          <TextInput
            className="border border-gray-200 p-4 mb-4 rounded-xl bg-gray-50 text-gray-800"
            placeholder="Task name"
            value={taskname}
            onChangeText={setTaskname}
            placeholderTextColor="#9CA3AF"
          />
          
          <TextInput
            className="border border-gray-200 p-4 mb-4 rounded-xl bg-gray-50 text-gray-800 min-h-[100]"
            placeholder="Description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity 
            className="border border-gray-200 p-4 mb-4 rounded-xl bg-gray-50 flex-row items-center justify-between"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="text-gray-800 font-montserrat">Due Date</Text>
            <Text className="text-gray-600 font-montserrat">{dueDate.toLocaleDateString()}</Text>
          </TouchableOpacity>

          {(showDatePicker || Platform.OS === 'ios') && (
            <View className="mb-4">
              <DateTimePicker
                value={dueDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            </View>
          )}

          <View className="mb-6">
            <Text className="text-gray-800 mb-3 font-medium font-montserrat">Priority</Text>
            <View className="flex-row gap-2">
              {(['low', 'medium', 'high'] as const).map((pri) => (
                <TouchableOpacity
                  key={pri}
                  className={`flex-1 px-4 py-3 rounded-xl ${
                    priority === pri 
                      ? 'bg-violet-600 border border-violet-700' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                  onPress={() => setPriority(pri)}
                >
                  <Text 
                    className={`text-center font-medium ${
                      priority === pri ? 'text-white' : 'text-gray-600'
                    } font-montserrat`}
                  >
                    {pri.charAt(0).toUpperCase() + pri.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="flex-row gap-4">
            <TouchableOpacity
              className="flex-1 px-6 py-4 rounded-xl bg-gray-100 border border-gray-200"
              onPress={onClose}
            >
              <Text className="text-center text-gray-700 font-medium">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 px-6 py-4 rounded-xl bg-violet-600 shadow-sm shadow-violet-300"
              onPress={handleSubmit}
            >
              <Text className="text-center text-white font-medium font-montserrat">
                {editingTask ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
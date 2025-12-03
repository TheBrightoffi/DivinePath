import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, Platform, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SQLite from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';

interface SQLiteRow {
  id: string;
  title: string;
  description: string;
  category: 'personal' | 'career' | 'health' | 'education' | 'other';
  targetDate: string;
  priority: 'low' | 'medium' | 'high';
  tags: string;
  progress: number;
  milestones: string;
  notes: string;
  created_at: string;
}

type Status = 'not-started' | 'in-progress' | 'completed';

interface Milestone {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: Status;
}

interface Note {
  id: string;
  content: string;
  date: string;
}

interface Roadmap {
  id: string;
  title: string;
  description: string;
  category: 'personal' | 'career' | 'health' | 'education' | 'other';
  targetDate: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  progress: number;
  milestones: Milestone[];
  notes: Note[];
  createdAt: string;
  updatedAt: string;
}

const db = SQLite.openDatabaseSync('mainapp.db');

const initializeDatabase = () => {
  const createRoadmapTable = db.prepareSync(`
    CREATE TABLE IF NOT EXISTS roadmap (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      targetDate TEXT,
      priority TEXT,
      tags TEXT,
      progress INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

  const createMilestoneTable = db.prepareSync(`
    CREATE TABLE IF NOT EXISTS milestone (
      id TEXT PRIMARY KEY,
      roadmap_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      startDate TEXT,
      endDate TEXT,
      status TEXT DEFAULT 'not-started',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (roadmap_id) REFERENCES roadmap (id)
    )`);

  const createNoteTable = db.prepareSync(`
    CREATE TABLE IF NOT EXISTS note (
      id TEXT PRIMARY KEY,
      roadmap_id TEXT,
      content TEXT NOT NULL,
      date TEXT,
      FOREIGN KEY (roadmap_id) REFERENCES roadmap (id)
    )`);

  try {
    createRoadmapTable.executeSync();
    createMilestoneTable.executeSync();
    createNoteTable.executeSync();
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    createRoadmapTable.finalizeSync();
    createMilestoneTable.finalizeSync();
    createNoteTable.finalizeSync();
  }
};

export default function CreateRoadmap() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [showNewRoadmapModal, setShowNewRoadmapModal] = useState(false);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTargetDatePicker, setShowTargetDatePicker] = useState(false);
  const [showMilestoneStartDatePicker, setShowMilestoneStartDatePicker] = useState(false);
  const [showMilestoneEndDatePicker, setShowMilestoneEndDatePicker] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [roadmapToDelete, setRoadmapToDelete] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [showMilestoneOptionsModal, setShowMilestoneOptionsModal] = useState(false);
  const [isEditingMilestone, setIsEditingMilestone] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'personal' | 'career' | 'health' | 'education' | 'other'>('personal');
  const [targetDate, setTargetDate] = useState(new Date());
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [tags, setTags] = useState('');
  const [note, setNote] = useState('');

  // Milestone form states
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneStartDate, setMilestoneStartDate] = useState(new Date());
  const [milestoneEndDate, setMilestoneEndDate] = useState(new Date());

  useEffect(() => {
    initializeDatabase();
    loadRoadmaps();
  }, []);

  const loadRoadmaps = () => {
    const stmt = db.prepareSync(`
      SELECT r.*, 
        GROUP_CONCAT(DISTINCT 
          m.id || '::' || 
          m.title || '::' || 
          m.description || '::' || 
          m.startDate || '::' || 
          m.endDate || '::' || 
          m.status
          ORDER BY m.startDate ASC, m.created_at ASC
        ) as milestones,
        GROUP_CONCAT(DISTINCT n.id || '::' || n.content || '::' || n.date) as notes
      FROM roadmap r
      LEFT JOIN milestone m ON r.id = m.roadmap_id
      LEFT JOIN note n ON r.id = n.roadmap_id
      GROUP BY r.id
    `);

    try {
      const results = stmt.executeSync<SQLiteRow>();
      const rows = results.getAllSync();
      const formattedRoadmaps: Roadmap[] = rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        targetDate: row.targetDate,
        priority: row.priority,
        tags: row.tags ? row.tags.split(',') : [],
        progress: row.progress || 0,
        milestones: row.milestones ? row.milestones.split(',').map(m => {
          const [id, title, description, startDate, endDate, status] = m.split('::');
          return {
            id,
            title,
            description,
            startDate,
            endDate,
            status: status as Status
          };
        }) : [],
        notes: row.notes ? row.notes.split(',').map(n => {
          const [id, content, date] = n.split('::');
          return { id, content, date };
        }) : [],
        createdAt: row.created_at,
        updatedAt: row.created_at // Using created_at as updatedAt since we don't track updates
      }));
      setRoadmaps(formattedRoadmaps);
    } catch (error) {
      console.error('Error loading roadmaps:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleCreateRoadmap = () => {
    const roadmapId = Math.random().toString(36).slice(2);
    const stmt = db.prepareSync('INSERT INTO roadmap (id, title, description, category, targetDate, priority, tags) VALUES (?, ?, ?, ?, ?, ?, ?)');

    try {
      stmt.executeSync([
        roadmapId,
        title,
        description,
        category,
        targetDate.toISOString(),
        priority,
        tags.split(',').map(tag => tag.trim()).join(',')
      ]);
      loadRoadmaps();
      resetForm();
      setShowNewRoadmapModal(false);
    } catch (error) {
      console.error('Error creating roadmap:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleEditRoadmap = () => {
    const stmt = db.prepareSync('UPDATE roadmap SET title = ?, description = ?, category = ?, targetDate = ?, priority = ?, tags = ? WHERE id = ?');

    try {
      stmt.executeSync([
        title,
        description,
        category,
        targetDate.toISOString(),
        priority,
        tags.split(',').map(tag => tag.trim()).join(','),
        selectedRoadmap?.id
      ]);
      loadRoadmaps();
      resetForm();
      setShowNewRoadmapModal(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating roadmap:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleEditClick = (roadmap: Roadmap) => {
    setSelectedRoadmap(roadmap);
    setTitle(roadmap.title);
    setDescription(roadmap.description);
    setCategory(roadmap.category);
    setTargetDate(new Date(roadmap.targetDate));
    setPriority(roadmap.priority);
    setTags(roadmap.tags.join(','));
    setIsEditing(true);
    setShowNewRoadmapModal(true);
  };

  const handleAddMilestone = () => {
    if (selectedRoadmap) {
      const milestoneId = Math.random().toString(36).slice(2);
      const stmt = db.prepareSync('INSERT INTO milestone (id, roadmap_id, title, description, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)');

      try {
        stmt.executeSync([
          milestoneId,
          selectedRoadmap.id,
          milestoneTitle,
          milestoneDescription,
          milestoneStartDate.toISOString(),
          milestoneEndDate.toISOString(),
          'not-started'
        ]);
        loadRoadmaps();
        resetMilestoneForm();
        setShowMilestoneModal(false);
      } catch (error) {
        console.error('Error adding milestone:', error);
      } finally {
        stmt.finalizeSync();
      }
    }
  };

  const handleEditMilestone = () => {
    if (selectedMilestone) {
      const stmt = db.prepareSync('UPDATE milestone SET title = ?, description = ?, startDate = ?, endDate = ? WHERE id = ? AND roadmap_id = ?');

      try {
        stmt.executeSync([
          milestoneTitle,
          milestoneDescription,
          milestoneStartDate.toISOString(),
          milestoneEndDate.toISOString(),
          selectedMilestone.id,
          selectedRoadmap?.id
        ]);
        loadRoadmaps();
        resetMilestoneForm();
        setShowMilestoneModal(false);
        setIsEditingMilestone(false);
        setSelectedMilestone(null);
      } catch (error) {
        console.error('Error updating milestone:', error);
      } finally {
        stmt.finalizeSync();
      }
    }
  };

  const handleMilestoneLongPress = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setShowMilestoneOptionsModal(true);
  };

  const handleEditMilestoneClick = () => {
    setMilestoneTitle(selectedMilestone?.title || '');
    setMilestoneDescription(selectedMilestone?.description || '');
    setMilestoneStartDate(new Date(selectedMilestone?.startDate || Date.now()));
    setMilestoneEndDate(new Date(selectedMilestone?.endDate || Date.now()));
    setIsEditingMilestone(true);
    setShowMilestoneOptionsModal(false);
    setShowMilestoneModal(true);
  };

  const handleAddNote = () => {
    if (selectedRoadmap && note) {
      const noteId = Math.random().toString(36).slice(2);
      const stmt = db.prepareSync('INSERT INTO note (id, roadmap_id, content, date) VALUES (?, ?, ?, ?)');

      try {
        stmt.executeSync([
          noteId,
          selectedRoadmap.id,
          note,
          new Date().toISOString()
        ]);
        loadRoadmaps();
        setNote('');
        setShowNoteModal(false);
      } catch (error) {
        console.error('Error adding note:', error);
      } finally {
        stmt.finalizeSync();
      }
    }
  };

  const handleDeleteRoadmap = (roadmapId: string) => {
    // Delete associated milestones and notes first
    const deleteMilestonesStmt = db.prepareSync('DELETE FROM milestone WHERE roadmap_id = ?');
    const deleteNotesStmt = db.prepareSync('DELETE FROM note WHERE roadmap_id = ?');
    const deleteRoadmapStmt = db.prepareSync('DELETE FROM roadmap WHERE id = ?');

    try {
      deleteMilestonesStmt.executeSync([roadmapId]);
      deleteNotesStmt.executeSync([roadmapId]);
      deleteRoadmapStmt.executeSync([roadmapId]);
      loadRoadmaps();
    } catch (error) {
      console.error('Error deleting roadmap:', error);
    } finally {
      deleteMilestonesStmt.finalizeSync();
      deleteNotesStmt.finalizeSync();
      deleteRoadmapStmt.finalizeSync();
    }
  };

  const updateRoadmapProgress = (roadmapId: string, milestones: Milestone[]) => {
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = milestones.length;
    const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const stmt = db.prepareSync('UPDATE roadmap SET progress = ? WHERE id = ?');
    try {
      stmt.executeSync([progress, roadmapId]);
    } catch (error) {
      console.error('Error updating roadmap progress:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleDeleteMilestone = (milestoneId: string, roadmapId: string) => {
    const stmt = db.prepareSync('DELETE FROM milestone WHERE id = ? AND roadmap_id = ?');
    try {
      stmt.executeSync([milestoneId, roadmapId]);
      loadRoadmaps();
    } catch (error) {
      console.error('Error deleting milestone:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleDeleteNote = (noteId: string, roadmapId: string) => {
    const stmt = db.prepareSync('DELETE FROM note WHERE id = ? AND roadmap_id = ?');
    try {
      stmt.executeSync([noteId, roadmapId]);
      loadRoadmaps();
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleToggleMilestoneStatus = (roadmapId: string, milestone: Milestone, allMilestones: Milestone[]) => {
    const newStatus: Status = milestone.status === 'completed' ? 'in-progress' : 'completed';
    const stmt = db.prepareSync('UPDATE milestone SET status = ? WHERE id = ? AND roadmap_id = ?');

    try {
      stmt.executeSync([newStatus, milestone.id, roadmapId]);
      const updatedMilestones = allMilestones.map(m =>
        m.id === milestone.id ? { ...m, status: newStatus as Status } : m
      );
      updateRoadmapProgress(roadmapId, updatedMilestones);
      loadRoadmaps();
    } catch (error) {
      console.error('Error updating milestone status:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleTargetDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTargetDatePicker(false);
    }
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const handleMilestoneStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowMilestoneStartDatePicker(false);
    }
    if (selectedDate) {
      setMilestoneStartDate(selectedDate);
    }
  };

  const handleMilestoneEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowMilestoneEndDatePicker(false);
    }
    if (selectedDate) {
      setMilestoneEndDate(selectedDate);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('personal');
    setTargetDate(new Date());
    setPriority('medium');
    setTags('');
  };

  const resetMilestoneForm = () => {
    setMilestoneTitle('');
    setMilestoneDescription('');
    setMilestoneStartDate(new Date());
    setMilestoneEndDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in-progress': return '#FFC107';
      default: return '#9E9E9E';
    }
  };

  return (
    <View className="flex-1 bg-gray-50 p-2">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="px-6 py-4 bg-slate-100 m-2 mb-5 rounded-md  border-b border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-gray-800">Roadmap</Text>
          <Text className="text-sm text-gray-500 mt-1">Keep track of your important Roadmaps</Text>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          onPress={() => setShowNewRoadmapModal(true)}
          className="bg-blue-600 rounded-full w-12 h-12 items-center justify-center shadow-lg"
          style={{ elevation: 4 }}
        >
          <Text className="text-white text-2xl">+</Text>
        </TouchableOpacity>
      </View>

      {/* <TouchableOpacity 
        className="flex-row items-center justify-center bg-blue-600 p-2 m-5 mt-5 mb-5 rounded-xl shadow-lg"
        onPress={() => setShowNewRoadmapModal(true)}
      >
        <Icon name="add" size={24} color="#fff" />
        <Text className="text-white font-montserrat-bold ml-2 text-lg">Create New Roadmap</Text>
      </TouchableOpacity> */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        className="flex-1"
      >
        {roadmaps.map(roadmap => (
          <View key={roadmap.id} className="bg-white rounded-xl shadow-lg w-[350px] mr-4 h-[80vh]">
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="flex-1"
            >
              <View className="p-6">
                <View className="flex-row justify-between items-start mb-4">
                  <Text className="font-montserrat-bold text-xl text-gray-800 flex-1 pr-4">{roadmap.title}</Text>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      onPress={() => handleEditClick(roadmap)}
                      className="p-2"
                    >
                      <Icon name="edit" size={20} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setRoadmapToDelete(roadmap.id);
                        setShowDeleteConfirmation(true);
                      }}
                      className="p-2"
                    >
                      <Icon name="delete" size={20} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text className="font-montserrat mb-6">{roadmap.description}</Text>

                <View className="mb-6">
                  <View className="w-full bg-gray-200 rounded-full h-4">
                    <View
                      className="bg-blue-500 h-4 rounded-full"
                      style={{ width: `${roadmap.progress}%` }}
                    />
                  </View>
                  <Text className="text-center font-montserrat-bold text-blue-600 mt-2">
                    {roadmap.progress}% Complete
                  </Text>
                </View>

                <View className="mb-6">
                  {roadmap.milestones.map((milestone, index) => (
                    <TouchableOpacity
                      key={milestone.id}
                      className="flex-row items-center mb-6 relative"
                      onPress={() => handleToggleMilestoneStatus(roadmap.id, milestone, roadmap.milestones)}
                      onLongPress={() => handleMilestoneLongPress(milestone)}
                      delayLongPress={1000}
                    >
                      <View className="relative z-10">
                        <View
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${milestone.status === 'completed' ? 'bg-green-500' :
                            milestone.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-300'
                            } shadow-md`}
                        >
                          {milestone.status === 'completed' && (
                            <Icon name="check" size={16} color="#fff" />
                          )}
                          {milestone.status === 'in-progress' && (
                            <View className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </View>
                        {index !== roadmap.milestones.length - 1 && (
                          <View
                            className={`absolute left-1/2 top-6 w-0.5 h-12 -translate-x-1/2 ${milestone.status === 'completed' ? 'bg-green-300' :
                              milestone.status === 'in-progress' ? 'bg-yellow-300' : 'bg-gray-200'
                              }`}
                          />
                        )}
                      </View>

                      <View className="flex-1 ml-4 bg-white rounded-lg p-4 shadow-md">
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1">
                            <Text className="font-montserrat-bold text-gray-800 text-base">
                              {milestone.title}
                            </Text>
                            <Text className="font-montserrat text-gray-500 text-xs mt-1">
                              {milestone.description}
                            </Text>
                          </View>
                          <View
                            // className={`px-2 py-2 p-2 rounded-full ml-2 items-center justify-center ${
                            // milestone.status === 'completed' ? 'bg-green-100' :
                            // milestone.status === 'in-progress' ? 'bg-yellow-100' : 'bg-gray-100'
                            // }`}
                            style={{ alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Text
                              className={`font-montserrat-bold text-xs ${milestone.status === 'completed' ? 'text-green-700' :
                                milestone.status === 'in-progress' ? 'text-yellow-700' : 'text-gray-700'
                                }`}
                              style={{ textAlign: 'center' }}
                            >
                              {milestone.status.replace('-', ' ').toUpperCase()}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center mt-2">
                          <Icon name="event" size={14} color="#6B7280" />
                          <Text className="font-montserrat text-xs text-gray-500 ml-1">
                            {new Date(milestone.startDate).toLocaleDateString()} -
                            {new Date(milestone.endDate).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="flex-row gap-3 mb-6">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center bg-gray-500 p-3 rounded-lg mr-5"
                    onPress={() => {
                      setSelectedRoadmap(roadmap);
                      setShowMilestoneModal(true);
                    }}
                  >
                    <Icon name="add-task" size={20} color="#fff" />
                    <Text className="text-white font-montserrat ml-2">Milestone</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-cente bg-blue-600 p-3 rounded-lg"
                    onPress={() => {
                      setSelectedRoadmap(roadmap);
                      setShowNoteModal(true);
                    }}
                  >
                    <Icon name="note-add" size={20} color="#fff" />
                    <Text className="text-white font-montserrat ml-2">Add Note</Text>
                  </TouchableOpacity>
                </View>

                {roadmap.notes.length > 0 && (
                  <View className="border-t border-gray-100 pt-4">
                    <Text className="font-montserrat-bold text-lg text-gray-800 mb-4">Notes & Reflections</Text>
                    {roadmap.notes.map((note, index) => (
                      <View key={index} className="bg-gray-50 rounded-lg p-4 mb-3">
                        <Text className="text-xs text-gray-500 font-montserrat mb-2">
                          {new Date(note.date).toLocaleDateString()}
                        </Text>
                        <Text className="text-gray-700 font-montserrat">{note.content}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmation}
        animationType="fade"
        transparent={true}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-2xl p-6 w-[90%] max-w-sm">
            <Text className="font-montserrat-bold text-xl text-gray-800 mb-4">Delete Roadmap</Text>
            <Text className="font-montserrat text-gray-600 mb-6">
              Are you sure you want to delete this roadmap? This action cannot be undone.
            </Text>

            <View className="flex-row justify-end gap-3">
              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-gray-100"
                onPress={() => {
                  setShowDeleteConfirmation(false);
                  setRoadmapToDelete(null);
                }}
              >
                <Text className="font-montserrat-bold text-gray-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-4 py-2 rounded-lg bg-red-500"
                onPress={() => {
                  if (roadmapToDelete) {
                    handleDeleteRoadmap(roadmapToDelete);
                    setShowDeleteConfirmation(false);
                    setRoadmapToDelete(null);
                  }
                }}
              >
                <Text className="font-montserrat-bold text-white">Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* New/Edit Roadmap Modal */}
      <Modal
        visible={showNewRoadmapModal}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-2xl p-6">
            <Text className="font-montserrat-bold text-2xl text-gray-800 mb-6">
              {isEditing ? 'Edit Roadmap' : 'Create New Roadmap'}
            </Text>

            <TextInput
              className="bg-gray-50 rounded-lg p-4 mb-4 font-montserrat"
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              className="bg-gray-50 rounded-lg p-4 mb-4 font-montserrat h-24"
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View className="mb-4">
              <Text className="font-montserrat-bold text-gray-700 mb-2">Category:</Text>
              <View className="flex-row flex-wrap gap-2">
                {['personal', 'career', 'health', 'education', 'other'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    className={`px-4 py-2 rounded-full ${category === cat
                      ? 'bg-blue-500'
                      : 'bg-gray-100'
                      }`}
                    onPress={() => setCategory(cat as any)}
                  >
                    <Text className={`font-montserrat ${category === cat
                      ? 'text-white'
                      : 'text-gray-700'
                      }`}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View className="mb-4">
              <Text className="font-montserrat-bold text-gray-700 mb-2">Priority:</Text>
              <View className="flex-row gap-2">
                {['low', 'medium', 'high'].map(pri => (
                  <TouchableOpacity
                    key={pri}
                    className={`flex-1 px-4 py-2 rounded-lg ${priority === pri
                      ? pri === 'high'
                        ? 'bg-red-500'
                        : pri === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      : 'bg-gray-100'
                      }`}
                    onPress={() => setPriority(pri as any)}
                  >
                    <Text className={`font-montserrat text-center ${priority === pri
                      ? 'text-white'
                      : 'text-gray-700'
                      }`}>
                      {pri.charAt(0).toUpperCase() + pri.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              className="bg-gray-50 rounded-lg p-4 mb-4 font-montserrat"
              placeholder="Tags (comma separated)"
              value={tags}
              onChangeText={setTags}
            />

            <TouchableOpacity
              className="bg-gray-50 rounded-lg p-4 mb-4"
              onPress={() => setShowTargetDatePicker(true)}
            >
              <Text className="font-montserrat text-gray-700">
                Target Date: {targetDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {(showTargetDatePicker || Platform.OS === 'ios') && (
              <DateTimePicker
                value={targetDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTargetDateChange}
              />
            )}

            <View className="flex-row justify-end gap-3 mt-6">
              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-gray-200"
                onPress={() => {
                  resetForm();
                  setShowNewRoadmapModal(false);
                  setIsEditing(false);
                }}
              >
                <Text className="font-montserrat-bold text-gray-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-blue-500"
                onPress={isEditing ? handleEditRoadmap : handleCreateRoadmap}
              >
                <Text className="font-montserrat-bold text-white">
                  {isEditing ? 'Save Changes' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Milestone Options Modal */}
      <Modal
        visible={showMilestoneOptionsModal}
        animationType="fade"
        transparent={true}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-4">
          <View className="bg-white rounded-2xl p-6 w-[90%] max-w-sm">
            <Text className="font-montserrat-bold text-xl text-gray-800 mb-6">
              Milestone Options
            </Text>

            <TouchableOpacity
              className="flex-row items-center p-4 bg-gray-50 rounded-lg mb-3"
              onPress={handleEditMilestoneClick}
            >
              <Icon name="edit" size={24} color="#4B5563" />
              <Text className="font-montserrat text-gray-700 ml-3">Edit Milestone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center p-4 bg-red-50 rounded-lg"
              onPress={() => {
                if (selectedMilestone && selectedRoadmap) {
                  handleDeleteMilestone(selectedMilestone.id, selectedRoadmap.id);
                  setShowMilestoneOptionsModal(false);
                  setSelectedMilestone(null);
                }
              }}
            >
              <Icon name="delete" size={24} color="#EF4444" />
              <Text className="font-montserrat text-red-600 ml-3">Delete Milestone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="mt-6 p-4 bg-gray-100 rounded-lg"
              onPress={() => {
                setShowMilestoneOptionsModal(false);
                setSelectedMilestone(null);
              }}
            >
              <Text className="font-montserrat-bold text-gray-700 text-center">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Milestone Modal */}
      <Modal
        visible={showMilestoneModal}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-2xl p-6">
            <Text className="font-montserrat-bold text-2xl text-gray-800 mb-6">
              {isEditingMilestone ? 'Edit Milestone' : 'Add Milestone'}
            </Text>

            <TextInput
              className="bg-gray-50 rounded-lg p-4 mb-4 font-montserrat"
              placeholder="Milestone Title"
              value={milestoneTitle}
              onChangeText={setMilestoneTitle}
            />

            <TextInput
              className="bg-gray-50 rounded-lg p-4 mb-4 font-montserrat h-24"
              placeholder="Milestone Description"
              value={milestoneDescription}
              onChangeText={setMilestoneDescription}
              multiline
            />

            <TouchableOpacity
              className="bg-gray-50 rounded-lg p-4 mb-4"
              onPress={() => setShowMilestoneStartDatePicker(true)}
            >
              <Text className="font-montserrat text-gray-700">
                Start Date: {milestoneStartDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {(showMilestoneStartDatePicker || Platform.OS === 'ios') && (
              <DateTimePicker
                value={milestoneStartDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleMilestoneStartDateChange}
              />
            )}

            <TouchableOpacity
              className="bg-gray-50 rounded-lg p-4 mb-4"
              onPress={() => setShowMilestoneEndDatePicker(true)}
            >
              <Text className="font-montserrat text-gray-700">
                End Date: {milestoneEndDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>

            {(showMilestoneEndDatePicker || Platform.OS === 'ios') && (
              <DateTimePicker
                value={milestoneEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleMilestoneEndDateChange}
              />
            )}

            <View className="flex-row justify-end gap-3 mt-6">
              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-gray-200"
                onPress={() => {
                  resetMilestoneForm();
                  setShowMilestoneModal(false);
                  setIsEditingMilestone(false);
                  setSelectedMilestone(null);
                }}
              >
                <Text className="font-montserrat-bold text-gray-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-blue-500"
                onPress={isEditingMilestone ? handleEditMilestone : handleAddMilestone}
              >
                <Text className="font-montserrat-bold text-white">
                  {isEditingMilestone ? 'Save Changes' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent={true}
      >
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-2xl p-6">
            <Text className="font-montserrat-bold text-2xl text-gray-800 mb-6">Add Note</Text>

            <TextInput
              className="bg-gray-50 rounded-lg p-4 mb-4 font-montserrat h-32"
              placeholder="Write your reflection..."
              value={note}
              onChangeText={setNote}
              multiline
            />

            <View className="flex-row justify-end gap-3 mt-6">
              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-gray-200"
                onPress={() => {
                  setNote('');
                  setShowNoteModal(false);
                }}
              >
                <Text className="font-montserrat-bold text-gray-700">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-6 py-3 rounded-lg bg-blue-500"
                onPress={handleAddNote}
              >
                <Text className="font-montserrat-bold text-white">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
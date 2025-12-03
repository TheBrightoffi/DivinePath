import { SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View, Modal, Alert, Animated } from "react-native"
import { Image } from "react-native"
import Icon from "react-native-vector-icons/Feather"
import MaterialIcon from "react-native-vector-icons/MaterialIcons"
import { useState, useEffect, useRef } from "react"
import * as SQLite from 'expo-sqlite';
import AddTaskModal from '../components/AddTaskModal';
import { GestureHandlerRootView, Swipeable, LongPressGestureHandler, State } from 'react-native-gesture-handler';

interface Task {
  id: number;
  taskname: string;
  description: string;
  duedate: string;
  priority: string;
  status: 'pending' | 'completed';
  when_completed: string | null;
  created_date: string;
  updated_date: string;
}

interface TaskStats {
  total: number;
  completed: number;
}

const db = SQLite.openDatabaseSync('mainapp.db');

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // null means "All Tasks"
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, percentage: 0 });
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  interface EditingTask {
    id: number;
    taskname: string;
    description: string;
    duedate: string;
    priority: 'low' | 'medium' | 'high';
  }

  const [editingTask, setEditingTask] = useState<EditingTask | null>(null);

  // Reference to currently open swipeable
  const swipeableRef = useRef<Swipeable | null>(null);

  // Auto-scroll effect
  useEffect(() => {
    const scrollInterval = setInterval(() => {
      if (scrollViewRef.current) {
        const nextIndex = currentCardIndex === 0 ? 1 : 0;
        scrollViewRef.current.scrollTo({
          x: nextIndex * 330, // Approximate width of card including margin
          animated: true
        });
        setCurrentCardIndex(nextIndex);
      }
    }, 5000); // Scroll every 5 seconds

    return () => clearInterval(scrollInterval);
  }, [currentCardIndex]);

  const deleteTask = (taskId: number) => {
    Alert.alert(
      "Delete Task",
      "Are you sure you want to delete this task?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const stmt = db.prepareSync('DELETE FROM tasks WHERE id = ?');
            try {
              stmt.executeSync([taskId]);
              loadTasks();
            } catch (error) {
              console.error('Error deleting task:', error);
            } finally {
              stmt.finalizeSync();
            }
          }
        }
      ]
    );
  };

  const handleLongPress = (task: Task) => {
    setEditingTask({
      id: task.id,
      taskname: task.taskname,
      description: task.description,
      duedate: task.duedate,
      priority: task.priority as 'low' | 'medium' | 'high'
    });
    setModalVisible(true);
  };

  // Generate array of dates from today to 30 days ahead
  const getDates = () => {
    const dates = [];
    const today = new Date();

    for (let i = 0; i < 31; i++) {  // 0 to 30 (31 days total including today)
      const date = new Date();
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  useEffect(() => {
    // Create tasks table when component mounts
    const stmt = db.prepareSync(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        taskname TEXT NOT NULL,
        description TEXT,
        duedate TEXT,
        priority TEXT,
        status TEXT DEFAULT 'pending',
        when_completed TEXT,
        created_date TEXT,
        updated_date TEXT
      );
    `);
    try {
      stmt.executeSync();
    } catch (error) {
      console.error('Error creating table:', error);
    } finally {
      stmt.finalizeSync();
    }
    loadTasks();
    updateTaskStats();
  }, []);

  useEffect(() => {
    // Filter tasks based on selected date
    if (selectedDate === null) {
      setFilteredTasks(tasks); // Show all tasks
    } else {
      const filtered = tasks.filter(task => {
        const taskDate = new Date(task.duedate);
        return taskDate.toDateString() === selectedDate.toDateString();
      });
      setFilteredTasks(filtered);
    }
  }, [selectedDate, tasks]);

  const loadTasks = () => {
    const stmt = db.prepareSync('SELECT * FROM tasks ORDER BY created_date DESC');
    try {
      const results = stmt.executeSync<Task>();
      const rows = results.getAllSync();
      setTasks(rows);
      updateTaskStats(); // Update stats whenever tasks are loaded
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const updateTaskStats = () => {
    const stmt = db.prepareSync('SELECT COUNT(*) as total, SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed FROM tasks');
    try {
      const results = stmt.executeSync();
      const row = results.getAllSync()[0] as TaskStats;
      const percentage = row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0;
      setTaskStats({ total: row.total, completed: row.completed, percentage });
    } catch (error) {
      console.error('Error calculating task stats:', error);
    } finally {
      stmt.finalizeSync();
    }
  };

  const handleTaskStatusToggle = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      const when_completed = newStatus === 'completed' ? new Date().toISOString() : null;

      const stmt = db.prepareSync(
        'UPDATE tasks SET status = ?, when_completed = ?, updated_date = ? WHERE id = ?'
      );
      try {
        stmt.executeSync([
          newStatus,
          when_completed,
          new Date().toISOString(),
          taskId
        ]);
        loadTasks();
      } catch (error) {
        console.error('Error updating task status:', error);
      } finally {
        stmt.finalizeSync();
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short'
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        {/* Cards ScrollView */}
        {/* <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          className="mb-4"
          ref={scrollViewRef}
          onMomentumScrollEnd={(event) => {
            const offset = event.nativeEvent.contentOffset.x;
            const index = Math.round(offset / 330);
            setCurrentCardIndex(index);
          }}
        >
          <View className="bg-violet-600 rounded-xl p-3 m-5" style={{ width: 320, height: 50 }}>
            <View className="flex-row justify-between items-center">
              <View className="w-3/5">
                <Text className="text-white font-medium mb-1 font-montserrat">You n Do IT</Text>
              </View>
              <View className="w-3/5 items-center">
                <Image
                  source={require('../../assets/images/png.png')}
                  style={{ width: 50, height: 50, marginBottom: -14 }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          <View className="bg-violet-600 rounded-xl p-3 m-5" style={{ width: 320, height: 50 }}>
            <View className="flex-row justify-between items-center">
              <View className="w-3/5">
                <Text className="text-white font-medium mb-1 font-montserrat">Yosdfdsfds</Text>
              </View>
              <View className="w-3/5 items-center">
                <Image
                  source={require('../../assets/images/png.png')}
                  style={{ width: 50, height: 50, marginBottom: -14 }}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        </ScrollView> */}

        {/* Pagination Dots */}
        {/* <View className="flex-row justify-center items-center mb-4">
          <View 
            className={`h-2 w-2 rounded-full mx-1 ${currentCardIndex === 0 ? 'bg-violet-600' : 'bg-gray-300'}`} 
          />
          <View 
            className={`h-2 w-2 rounded-full mx-1 ${currentCardIndex === 1 ? 'bg-violet-600' : 'bg-gray-300'}`} 
          />
        </View> */}

        <View className="px-6 py-4 bg-slate-100 m-2 rounded-md border-b border-gray-100 flex-row justify-between items-center">
          <View>
            <Text className="text-2xl text-gray-800 font-montserrat-bold">Tasks</Text>
            <Text className="text-sm text-gray-500 mt-1 font-montserrat">{taskStats.completed} of {taskStats.total} tasks completed ({taskStats.percentage}%)</Text>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-blue-600 rounded-full w-12 h-12 items-center justify-center shadow-lg"
            style={{ elevation: 4 }}
          >
            <Text className="text-white text-2xl font-montserrat">+</Text>
          </TouchableOpacity>
        </View>



        {/* Date Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-5 mb-4 mt-5"
          style={{ minHeight: 40, maxHeight: 40 }}
        >
          {/* All Tasks option */}
          <TouchableOpacity
            onPress={() => setSelectedDate(null)}
            className={`mr-4 px-4 py-2 rounded-xl ${selectedDate === null ? 'bg-violet-600' : 'bg-gray-100'}`}
          >
            <Text
              className={`text-center font-montserrat ${selectedDate === null ? 'text-white' : 'text-gray-600'}`}
            >
              All Tasks
            </Text>
          </TouchableOpacity>

          {getDates().map((date, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedDate(date)}
              className={`mr-4 px-4 py-2 rounded-xl ${selectedDate?.toDateString() === date.toDateString()
                ? 'bg-violet-600'
                : 'bg-gray-100'
                }`}
            >
              <Text
                className={`text-center font-montserrat ${selectedDate?.toDateString() === date.toDateString()
                  ? 'text-white'
                  : 'text-gray-600'}`}
              >
                {formatDate(date)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView className="px-5">
          {/* Task List */}
          <View className="mb-6">
            {filteredTasks.map((task) => (
              <Swipeable
                key={task.id}
                ref={ref => {
                  if (ref && task.id === filteredTasks[0]?.id) {
                    swipeableRef.current = ref;
                  }
                }}
                renderRightActions={(progress, dragX) => {
                  const scale = dragX.interpolate({
                    inputRange: [-100, 0],
                    outputRange: [1, 0],
                    extrapolate: 'clamp',
                  });
                  return (
                    <TouchableOpacity
                      className="bg-red-500 w-20 justify-center items-center"
                      onPress={() => {
                        swipeableRef.current?.close();
                        deleteTask(task.id);
                      }}
                    >
                      <Animated.View style={{ transform: [{ scale }] }}>
                        <Icon name="trash-2" size={24} color="#fff" />
                      </Animated.View>
                    </TouchableOpacity>
                  );
                }}
              >
                <TouchableOpacity
                  className="bg-gray-100 rounded-xl p-4 mb-3"
                  onPress={() => handleTaskStatusToggle(task.id)}
                  onLongPress={() => handleLongPress(task)}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <View className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`} />
                        <Text className={`font-montserrat ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-black'}`}>
                          {task.taskname}
                        </Text>
                      </View>
                      {task.description ? (
                        <Text className="text-gray-500 font-montserrat text-sm mt-1 ml-4">{task.description}</Text>
                      ) : null}
                      <Text className="text-gray-400 font-montserrat text-xs mt-2 ml-4">
                        Due: {new Date(task.duedate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className={`h-6 w-6 rounded-full border-2 ${task.status === 'completed' ? 'bg-violet-600 border-violet-600' : 'border-gray-300'} items-center justify-center`}>
                      {task.status === 'completed' && (
                        <Icon name="check" size={14} color="#fff" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Swipeable>
            ))}
            {filteredTasks.length === 0 && (
              <View className="items-center justify-center py-8">
                <Text className="text-gray-400 font-montserrat">No tasks for this date</Text>
              </View>
            )}
          </View>
        </ScrollView>



        <AddTaskModal
          visible={modalVisible}
          editingTask={editingTask}
          onClose={() => {
            setModalVisible(false);
            setEditingTask(null);
            loadTasks(); // Refresh tasks after modal closes
          }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

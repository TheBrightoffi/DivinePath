import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Modal ,StatusBar} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as SQLite from 'expo-sqlite';
import { format, differenceInDays, parse } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Remainder {
    id: number;
    name: string;
    date: string;
    completed: number;
    alert_days?: number;
}

const db = SQLite.openDatabaseSync('mainapp.db');

export default function Remainder_daywise() {
    const [remainders, setRemainders] = useState<Remainder[]>([]);
    const [newName, setNewName] = useState('');
    const [newDate, setNewDate] = useState('');
    const [alertDays, setAlertDays] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isEditing, setIsEditing] = useState(false);
    const [editingRemainder, setEditingRemainder] = useState<Remainder | null>(null);

    // Add delete function
    const deleteRemainder = (id: number) => {
        Alert.alert(
            "Delete Reminder",
            "Are you sure you want to delete this reminder?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        const stmt = db.prepareSync('DELETE FROM remainder_day WHERE id = ?');
                        try {
                            stmt.executeSync([id]);
                            fetchRemainders();
                        } catch (error) {
                            console.error('Error deleting remainder:', error);
                            Alert.alert('Error', 'Failed to delete remainder');
                        } finally {
                            stmt.finalizeSync();
                        }
                    }
                }
            ]
        );
    };

    // Add edit function
    const editRemainder = () => {
        if (!editingRemainder || !newName || !newDate) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const stmt = db.prepareSync(
            'UPDATE remainder_day SET name = ?, date = ?, alert_days = ? WHERE id = ?'
        );

        try {
            stmt.executeSync([
                newName, 
                newDate, 
                alertDays ? parseInt(alertDays) : null, 
                editingRemainder.id
            ]);
            setNewName('');
            setNewDate('');
            setAlertDays('');
            setShowModal(false);
            setIsEditing(false);
            setEditingRemainder(null);
            fetchRemainders();
        } catch (error) {
            console.error('Error updating remainder:', error);
            Alert.alert('Error', 'Failed to update remainder');
        } finally {
            stmt.finalizeSync();
        }
    };

    const startEditing = (remainder: Remainder) => {
        setEditingRemainder(remainder);
        setNewName(remainder.name);
        setNewDate(remainder.date);
        setAlertDays(remainder.alert_days?.toString() || '');
        setIsEditing(true);
        setShowModal(true);
    };

    useEffect(() => {
        // Modify table to add alert_days column if it doesn't exist
        try {
            db.execSync(
                'ALTER TABLE remainder_day ADD COLUMN alert_days INTEGER DEFAULT NULL'
            );
        } catch (error) {
            // Column might already exist, ignore the error
            console.log('Alert days column might already exist');
        }
        fetchRemainders();
    }, []);

    const fetchRemainders = () => {
        const stmt = db.prepareSync('SELECT * FROM remainder_day ORDER BY date ASC');
        try {
            const results = stmt.executeSync<Remainder>();
            const rows = results.getAllSync();
            setRemainders(rows);
        } catch (error) {
            console.error('Error fetching remainders:', error);
            Alert.alert('Error', 'Failed to load remainders');
        } finally {
            stmt.finalizeSync();
        }
    };

    const addRemainder = () => {
        if (!newName || !newDate) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        const stmt = db.prepareSync(
            'INSERT INTO remainder_day (name, date, completed, alert_days) VALUES (?, ?, 0, ?)'
        );

        try {
            stmt.executeSync([newName, newDate, alertDays ? parseInt(alertDays) : null]);
            setNewName('');
            setNewDate('');
            setAlertDays('');
            setShowModal(false);
            fetchRemainders();
        } catch (error) {
            console.error('Error adding remainder:', error);
            Alert.alert('Error', 'Failed to add remainder');
        } finally {
            stmt.finalizeSync();
        }
    };

    const onDateChange = (event: any, selected: Date | undefined) => {
        setShowDatePicker(false);
        if (selected) {
            setSelectedDate(selected);
            setNewDate(format(selected, 'dd-MM-yyyy'));
        }
    };

    const toggleComplete = (id: number, completed: number) => {
        const stmt = db.prepareSync(
            'UPDATE remainder_day SET completed = ? WHERE id = ?'
        );

        try {
            stmt.executeSync([completed ? 0 : 1, id]);
            fetchRemainders();
        } catch (error) {
            console.error('Error updating remainder:', error);
            Alert.alert('Error', 'Failed to update remainder');
        } finally {
            stmt.finalizeSync();
        }
    };

    const getDaysLeft = (dateString: string) => {
        const date = parse(dateString, 'dd-MM-yyyy', new Date());
        const today = new Date();
        return differenceInDays(date, today);
    };

    const getBgColorClass = (daysLeft: number, completed: number) => {
        if (completed) return 'bg-gray-200';
        if (daysLeft <= 2) return 'bg-red-200';
        if (daysLeft <= 5) return 'bg-yellow-100';
        return 'bg-white';
    };

    return (
        <View className="flex-1 p-4 bg-white">
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
            {/* Header with Stats */}

            <View className="px-6 py-4 bg-slate-100 mb-5 rounded-md border-b border-gray-100 flex-row justify-between items-center">
                <View>

                    <Text className="text-2xl font-bold text-gray-800">Remainder</Text>
                    <Text className="text-sm text-gray-500">
                        {remainders.filter(r => r.completed).length} of {remainders.length} reminders completed (
                        {remainders.length > 0
                            ? Math.round((remainders.filter(r => r.completed).length / remainders.length) * 100)
                            : 0}%)
                 </Text>
                </View>

                {/* Add Button */}
                <TouchableOpacity
                    onPress={() => setShowModal(true)}
                    className="bg-blue-600 rounded-full w-12 h-12 items-center justify-center shadow-lg"
                    style={{ elevation: 4 }}
                >
                    <Icon name="plus" size={24} color="white" />
                </TouchableOpacity>
            </View>





            <Modal
                visible={showModal}
                animationType="slide"
                transparent={true}
            >
                <View className="flex-1 justify-end bg-black/50">
                    <View className="bg-white rounded-t-3xl p-6 shadow-2xl">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-2xl text-gray-800 font-montserrat">
                                {isEditing ? 'Edit Reminder' : 'New Reminder'}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowModal(false);
                                    setNewName('');
                                    setNewDate('');
                                    setAlertDays('');
                                    setIsEditing(false);
                                    setEditingRemainder(null);
                                }}
                                className="h-10 w-10 items-center justify-center rounded-full bg-gray-100"
                            >
                                <Icon name="close" size={24} color="#4B5563" />
                            </TouchableOpacity>
                        </View>

                        {/* Form Fields */}
                        <View className="space-y-4">
                            {/* Name Input */}
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-1 font-montserrat">Reminder Name</Text>
                                <TextInput
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 focus:border-blue-500"
                                    placeholder="Enter reminder name"
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>

                            {/* Date Input */}
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-1 font-montserrat">Due Date</Text>
                                <TouchableOpacity
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50"
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text className={newDate ? "text-gray-800 font-montserrat" : "text-gray-400 font-montserrat"}>
                                        {newDate || "Select date"}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={selectedDate}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                />
                            )}

                            {/* Alert Days Input */}
                            <View>
                                <Text className="text-sm font-medium text-gray-700 mb-1 font-montserrat">Alert Days Before</Text>
                                <TextInput
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800"
                                    placeholder="Enter number of days (optional)"
                                    value={alertDays}
                                    onChangeText={setAlertDays}
                                    keyboardType="numeric"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row space-x-3 mt-8">
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl bg-gray-100 border border-gray-200 flex-row items-center justify-center space-x-2"
                                onPress={() => {
                                    setShowModal(false);
                                    setNewName('');
                                    setNewDate('');
                                    setAlertDays('');
                                    setIsEditing(false);
                                    setEditingRemainder(null);
                                }}
                            >
                                <Icon name="close-circle-outline" size={20} color="#4B5563" />
                                <Text className="text-gray-700 font-semibold font-montserrat">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                className="flex-1 py-3 rounded-xl bg-blue-500 shadow-sm shadow-blue-500/30 flex-row items-center justify-center space-x-2"
                                onPress={isEditing ? editRemainder : addRemainder}
                            >
                                <Icon name={isEditing ? "content-save" : "plus-circle-outline"} size={20} color="white" />
                                <Text className="text-white font-semibold font-montserrat">
                                    {isEditing ? 'Save' : 'Add'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <ScrollView className="flex-1">
                {remainders.map((remainder) => {
                    const daysLeft = getDaysLeft(remainder.date);
                    const bgColorClass = getBgColorClass(daysLeft, remainder.completed);

                    return (
                        <View
                            key={remainder.id}
                            className={`p-4 rounded-lg shadow-sm border border-gray-200 mb-3 ${bgColorClass}`}
                        >
                            <View className="flex-row">
                                {/* Left side - Days Counter */}
                                <View className="pr-4 border-r border-gray-200 justify-center items-center min-w-[100]">
                                    {daysLeft < 0 ? (
                                        <View className="items-center">
                                            <Text className="text-2xl  text-red-500">!</Text>
                                            <Text className="text-sm font-medium text-red-500">Overdue</Text>
                                        </View>
                                    ) : daysLeft === 0 ? (
                                        <View className="items-center">
                                            <Text className="text-2xl  text-orange-500">0</Text>
                                            <Text className="text-sm font-medium text-orange-500">Today</Text>
                                        </View>
                                    ) : (
                                        <View className="items-center">
                                            <Text className="text-3xl  text-blue-500">{daysLeft}</Text>
                                            <Text className="text-sm font-medium text-gray-600">Days left</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Right side - Details */}
                                <View className="flex-1 pl-4">
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-1">
                                            <Text className={`text-lg font-bold text-gray-800 font-montserrat`}>
                                                {remainder.name}
                                            </Text>
                                            <Text className="text-gray-600 text-sm mt-1 font-montserrat">Due: {remainder.date}</Text>
                                            {remainder.alert_days && (
                                                <Text className="text-gray-600 text-sm font-montserrat">Alert: {remainder.alert_days} days before</Text>
                                            )}
                                        </View>
                                        <View className="flex-col space-y-2">
                                            <TouchableOpacity
                                                onPress={() => startEditing(remainder)}
                                                className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center"
                                            >
                                                <Icon name="pencil" size={18} color="#2563EB" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => deleteRemainder(remainder.id)}
                                                className="w-9 h-9 mt-1 rounded-full bg-red-100 items-center justify-center"
                                            >
                                                <Icon name="trash-can" size={18} color="#DC2626" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                className={`w-9 h-9 mt-1 rounded-full items-center justify-center ${
                                                    remainder.completed ? 'bg-gray-500' : 'bg-green-500'
                                                }`}
                                                onPress={() => toggleComplete(remainder.id, remainder.completed)}
                                            >
                                                <Icon 
                                                    name={remainder.completed ? "check-circle" : "checkbox-marked-circle-outline"} 
                                                    size={18} 
                                                    color="white" 
                                                />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                })}
                {remainders.length === 0 && (
                    <View className="items-center justify-center py-8">
                        <Text className="text-gray-400">No reminders found</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
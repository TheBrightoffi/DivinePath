import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StatusBar, Alert, Platform, Linking } from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

interface BasePdfDocument {
  id: string;
  title: string;
}

interface PdfDocument extends BasePdfDocument {
  url: string;
}

interface DownloadedPdf extends BasePdfDocument {
  url: string;
  downloadDate: string;
}

type PdfItem = PdfDocument | DownloadedPdf;

export default function OldPaper() {
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [downloadedPdfs, setDownloadedPdfs] = useState<DownloadedPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'downloaded'>('all');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissions();
    fetchPdfs();
    loadDownloadedPdfs();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please grant storage permission to download PDFs',
            [
              {
                text: 'OK',
                onPress: () => checkPermissions()
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
        Alert.alert('Error', 'Failed to request storage permission');
      }
    } else {
      setHasPermission(true);
    }
  };

  const fetchPdfs = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'pdf'));
      const pdfList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PdfDocument[];
      setPdfs(pdfList);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
      setLoading(false);
    }
  };

  const loadDownloadedPdfs = async () => {
    try {
      const downloadedPdfsJson = await AsyncStorage.getItem('downloadedPdfs');
      if (downloadedPdfsJson) {
        setDownloadedPdfs(JSON.parse(downloadedPdfsJson));
      }
    } catch (error) {
      console.error('Error loading downloaded PDFs:', error);
    }
  };

  const downloadPdf = async (pdf: PdfDocument) => {
    try {
      if (Platform.OS === 'android' && !hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant storage permission to download PDFs',
          [
            {
              text: 'OK',
              onPress: () => checkPermissions()
            }
          ]
        );
        return;
      }

      setDownloading(pdf.id);
      const fileName = `${pdf.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Download the file
      const downloadResumable = FileSystem.createDownloadResumable(
        pdf.url,
        fileUri
      );
      const downloadResult = await downloadResumable.downloadAsync();
      if (!downloadResult || !downloadResult.uri) {
        throw new Error('Failed to download PDF');
      }

      const newDownloadedPdf: DownloadedPdf = {
        id: pdf.id,
        title: pdf.title,
        url: downloadResult.uri,
        downloadDate: new Date().toISOString()
      };

      const updatedDownloadedPdfs = [...downloadedPdfs, newDownloadedPdf];
      await AsyncStorage.setItem('downloadedPdfs', JSON.stringify(updatedDownloadedPdfs));
      setDownloadedPdfs(updatedDownloadedPdfs);
      Alert.alert('Success', 'PDF downloaded successfully!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  const deleteDownloadedPdf = async (pdfId: string) => {
    try {
      if (Platform.OS === 'android' && !hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant storage permission to delete PDFs',
          [
            {
              text: 'OK',
              onPress: () => checkPermissions()
            }
          ]
        );
        return;
      }

      const pdfToDelete = downloadedPdfs.find(pdf => pdf.id === pdfId);
      if (pdfToDelete) {
        // Remove file from file system
        await FileSystem.deleteAsync(pdfToDelete.url, { idempotent: true });
        const updatedDownloadedPdfs = downloadedPdfs.filter(pdf => pdf.id !== pdfId);
        await AsyncStorage.setItem('downloadedPdfs', JSON.stringify(updatedDownloadedPdfs));
        setDownloadedPdfs(updatedDownloadedPdfs);
        Alert.alert('Success', 'PDF deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting PDF:', error);
      Alert.alert('Error', 'Failed to delete PDF');
    }
  };

  const handlePdfPress = async (item: PdfItem) => {
    // Open the PDF in the browser or external app
    let url = 'url' in item ? item.url : undefined;
    if (!url) {
      Alert.alert('Error', 'PDF URL not found.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this PDF URL.');
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'Failed to open PDF.');
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Stack.Screen
        options={{
          title: 'PY Question Papers',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: 'bold', color: '#00000' },
        }}
      />

      {/* Tab Navigation */}
      <View className="flex-row border-b border-gray-200 bg-white">
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'all' ? 'border-b-2 border-indigo-600' : ''}`}
          onPress={() => setActiveTab('all')}
        >
          <Text className={`text-center font-medium ${activeTab === 'all' ? 'text-indigo-600' : 'text-gray-500'}`}>
            All PDFs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-3 ${activeTab === 'downloaded' ? 'border-b-2 border-indigo-600' : ''}`}
          onPress={() => setActiveTab('downloaded')}
        >
          <Text className={`text-center font-medium ${activeTab === 'downloaded' ? 'text-indigo-600' : 'text-gray-500'}`}>
            Downloaded
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <View className="flex-1 px-4 pt-4">
          <FlatList<PdfItem>
            data={activeTab === 'all' ? pdfs : downloadedPdfs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="mb-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                onPress={() => handlePdfPress(item)}
              >
                <View className="p-4">
                  <Text className="text-lg font-semibold text-gray-800 mb-1">{item.title}</Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-indigo-600">Tap to view PDF</Text>
                    <View className="flex-row items-center space-x-2">
                      {activeTab === 'all' ? (
                        <TouchableOpacity
                          onPress={() => downloadPdf(item as PdfDocument)}
                          disabled={downloading === item.id}
                          className="bg-indigo-100 rounded-full px-3 py-1"
                        >
                          {downloading === item.id ? (
                            <ActivityIndicator size="small" color="#4F46E5" />
                          ) : (
                            <Text className="text-xs text-indigo-700">Download</Text>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          onPress={() => deleteDownloadedPdf(item.id)}
                          className="bg-red-100 rounded-full px-3 py-1"
                        >
                          <Text className="text-xs text-red-700">Delete</Text>
                        </TouchableOpacity>
                      )}
                      <View className="bg-indigo-100 rounded-full px-3 py-1">
                        <Text className="text-xs text-indigo-700">PDF</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            contentContainerClassName="pb-6"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}
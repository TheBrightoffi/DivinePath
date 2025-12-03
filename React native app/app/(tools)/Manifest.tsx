import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, Dimensions, ScrollView, ImageBackground, SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
import * as Speech from 'expo-speech';
import LottieView from 'lottie-react-native';

const db = SQLite.openDatabaseSync('mainapp.db');

interface Manifest {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

interface CardProps {
  manifest: Manifest;
  index: number;
}

const { width } = Dimensions.get('window');

const Card: React.FC<CardProps> = ({ manifest, index }) => {
  const handleSpeak = () => {
    Speech.speak(manifest.text, {
      language: 'en',
      pitch: 1,
      rate: 0.9,
    });
  };

  return (
    <View className="w-full h-[87%] rounded-3xl overflow-hidden shadow-lg">
      <View className="flex-1 bg-white p-6">
        <View className="flex-1 justify-center items-center">
          <Text className="font-montserrat-bold font-bold p-5 text-slate-600 text-5xl leading-130">
            {manifest.text}
          </Text>
        </View>
      </View>
    </View>
  );
};

const WelcomeCard = ({ onPress }: { onPress: () => void }) => {
  return (
    <View className="w-screen px-6 justify-center" style={{ width }}>
      <View className="w-full h-[87%] rounded-3xl overflow-hidden shadow-lg">
        <View className="flex-1 bg-white p-6">
          <View className="flex-1 justify-center items-center p-4">
            <View className="w-full h-72 justify-center items-center mb-8">
              <LottieView
                source={require('../../assets/universe_lottie.json')}
                autoPlay
                loop={true}
                style={{ width: 200, height: 200 }}
              />
            </View>
            <Text className="text-3xl font-montserrat-bold text-slate-600 text-center mb-4">
              Believe in the Universe
            </Text>
            <Text className="text-lg font-montserrat text-slate-600 text-center mb-8">
              Your thoughts shape your reality. Start manifesting today!
            </Text>
            {/* <TouchableOpacity
              className="bg-slate-600 px-8 py-4 rounded-xl"
              onPress={onPress}
            >
              <Text className="text-white font-montserrat-bold text-lg">Create Your First Manifest</Text>
            </TouchableOpacity> */}
          </View>
        </View>
      </View>
    </View>
  );
};

const ManifestScreen = () => {
  const router = useRouter();
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadManifests();
  }, []);

  const loadManifests = () => {
    try {
      setIsLoading(true);
      setError(null);
      const stmt = db.prepareSync('SELECT * FROM manifest ORDER BY createdAt DESC');
      const results = stmt.executeSync();
      const manifestData = results.getAllSync() as Manifest[];
      setManifests(manifestData);
      stmt.finalizeSync();
    } catch (error) {
      console.error('Failed to load manifests:', error);
      setError('Failed to load manifests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View className="flex-1 justify-center items-center">
          <Text className="text-xl font-montserrat-bold text-sky-950">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-xl font-montserrat-bold text-red-600 text-center mb-4">{error}</Text>
          <TouchableOpacity
            className="bg-slate-600 px-6 py-3 rounded-lg"
            onPress={loadManifests}
          >
            <Text className="text-white font-montserrat-bold">Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
                className="flex-1 border-2 bg-slate-600 border-slate-500 py-4 rounded-lg shadow-md active:bg-slate-100"
                onPress={() => router.push('/Home')}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  Done
                </Text>
              </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (manifests.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View className="flex-1 justify-center items-center p-4 bg-white">
          <View className="w-full h-72 justify-center items-center mb-8">
            <LottieView
              source={require('../../assets/universe_lottie.json')}
              autoPlay
              loop={true}
              style={{ width: 200, height: 200 }}
            />
          </View>
          <Text className="text-3xl font-montserrat-bold text-sky-950 text-center mb-4">
            Believe in the Universe
          </Text>
          <Text className="text-lg font-montserrat text-slate-600 text-center mb-8">
            Your thoughts shape your reality. Start manifesting today!
          </Text>
          <TouchableOpacity
            className="bg-slate-600 px-8 py-4 rounded-xl"
            onPress={() => router.push('/CreateManifest')}
          >
            <Text className="text-white font-montserrat-bold text-lg">Create Your First Manifest</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="flex-1 bg-gradient-to-b from-blue-50 to-white">
        <ImageBackground
          source={require('../../assets/m1.jpg')}
          className="w-full h-full"
          resizeMode="cover"
        >
          <View className="">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              className=""
              decelerationRate="fast"
            >
              <WelcomeCard onPress={() => router.push('/CreateManifest')} />
              {manifests.map((manifest, index) => (
                <View
                  key={manifest.id}
                  className="w-screen px-6 justify-center"
                  style={{ width }}
                >
                  <Card manifest={manifest} index={index} />
                </View>
              ))}
            </ScrollView>

            <View className="flex-row px-6 pb-8 pt-4 space-x-4">
              <TouchableOpacity
                className="flex-1 border-2 bg-slate-600 border-slate-500 py-4 rounded-lg shadow-md active:bg-slate-500"
                onPress={() => router.push('/Home')}
              >
                <Text className="text-white text-center font-montserrat-bold text-lg">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

export default ManifestScreen;
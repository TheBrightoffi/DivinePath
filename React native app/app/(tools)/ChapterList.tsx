import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, SafeAreaView, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

interface Chapter {
  id: string;
  name: string;
  priority: string;
  revisions?: number;
  lastRevised?: Date;
}

const ChapterListScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const subjectId = params.subjectId as string;
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [filteredChapters, setFilteredChapters] = useState<Chapter[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!subjectId) return;

      // Fetch subject name
      const subjectDoc = await getDoc(doc(db, 'subjects', subjectId));
      if (subjectDoc.exists()) {
        setSubjectName(subjectDoc.data().subject_name);
      }

      // Fetch chapters
      const q = query(collection(db, 'chapters'), where('subject_id', '==', subjectId));
      const querySnapshot = await getDocs(q);
      const chaptersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().chapter_name,
        priority: doc.data().priority,
        revisions: doc.data().revisions || 0,
        lastRevised: doc.data().lastRevised ? new Date(doc.data().lastRevised) : undefined,
      }));

      // Add Favorites as the first chapter
      const allChapters = [
        {
          id: 'favorites',
          name: 'Favorites',
          priority: '-1', // This ensures it stays at the top
          revisions: 0,
        },
        ...chaptersData
      ];
      
      setChapters(allChapters);
      setLoading(false);
    };
    fetchData();
  }, [subjectId]);

  useEffect(() => {
    const filtered = chapters.filter(chapter =>
      chapter.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredChapters(filtered);
  }, [searchQuery, chapters]);

  const handleRevision = async (chapterId: string) => {
    const chapterRef = doc(db, 'chapters', chapterId);
    const chapterDoc = await getDoc(chapterRef);

    if (chapterDoc.exists()) {
      const currentRevisions = chapterDoc.data().revisions || 0;
      await updateDoc(chapterRef, {
        revisions: currentRevisions + 1,
        lastRevised: new Date().toISOString()
      });

      // Update local state
      setChapters(chapters.map(ch =>
        ch.id === chapterId
          ? { ...ch, revisions: (ch.revisions || 0) + 1, lastRevised: new Date() }
          : ch
      ));
    }
  };

  const getCardColor = (revisions?: number) => {
    if (!revisions) return 'bg-white';
    if (revisions >= 3) return 'bg-slate-100';
    if (revisions >= 1) return 'bg-blue-50';
    return 'bg-white';
  };

  const renderShimmerLoading = () => (
    <>
      {[1, 2, 3, 4].map((_, index) => (
        <View
          key={index}
          className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 p-4 mb-4"
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <ShimmerPlaceholder
                style={{ width: 180, height: 24, marginBottom: 8, borderRadius: 4 }}
              />
              <ShimmerPlaceholder
                style={{ width: 120, height: 16, borderRadius: 4 }}
              />
            </View>
            <ShimmerPlaceholder
              style={{ width: 32, height: 32, borderRadius: 16 }}
            />
          </View>
        </View>
      ))}

    </>
  );

  const renderChapterCard = ({ item }: { item: Chapter }) => (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: "/(tools)/FlashcardList",
        params: { chapterId: item.id }
      })}
    >
      <View className={`${getCardColor(item.revisions)} p-4 rounded-lg mb-3 shadow-sm`}>
        <View className="flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-md text-gray-800 mb-2 font-montserrat-bold">{item.name}</Text>
            {item.lastRevised && (
              <Text className="text-xs text-gray-500 font-montserrat">
                Last revised: {item.lastRevised.toLocaleDateString()}
              </Text>
            )}
          </View>
          <View className="flex-row items-center">
            <Text className="text-sm text-gray-600 mr-3 font-montserrat">
              {item.revisions || 0} revisions
            </Text>
            <TouchableOpacity
              onPress={() => handleRevision(item.id)}
              className="bg-blue-500 rounded-full p-2"
            >
              <MaterialIcons name="done" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gery-50 p-5">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="mb-4">
        <TextInput
          placeholder="Search chapters..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          className="bg-white p-3 rounded-lg border border-gray-200 font-montserrat"
        />
      </View>
      <Text style={{ fontStyle: 'italic' }} className="text-gray-400 bg-slate-50 p-1 rounded-md text-xs text-center font-montserrat mb-5">
        "Revising isn't repetition—it's refinement. Every Flashcard brings you closer to LBSNAA."
      </Text>

      {loading ? (
        <View>{renderShimmerLoading()}</View>
      ) : filteredChapters.length > 0 ? (
        <FlatList
          data={filteredChapters}
          renderItem={renderChapterCard}
          keyExtractor={item => item.id}
          contentContainerClassName="pb-6"
        />
      ) : (
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-400 font-montserrat">No chapters found for this subject</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ChapterListScreen;

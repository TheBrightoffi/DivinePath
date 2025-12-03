import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { db } from '../../firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

interface Flashcard {
  id: string;
  title: string;
  description: string;
  chapter_id: string;
  favorite: boolean;
  timestamp: string;
  card_no?: number; // Adding optional card number
}

const FlashcardList = () => {
  const params = useLocalSearchParams();
  const chapterId = params.chapterId as string;
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFlashcards = async () => {
      try {
        let q;
        if (chapterId === 'favorites') {
          // Fetch all flashcards where favorite is true
          q = query(
            collection(db, 'flashcards'),
            where('favorite', '==', true)
          );
        } else {
          // Fetch flashcards for specific chapter
          q = query(
            collection(db, 'flashcards'),
            where('chapter_id', '==', chapterId)
          );
        }
        
        const querySnapshot = await getDocs(q);
        const cards = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Flashcard[];
        
        // Sort flashcards by card_no first (if it exists), then by timestamp
        const sortedCards = cards.sort((a, b) => {
          if (a.card_no && b.card_no) {
            return a.card_no - b.card_no;
          }
          if (a.card_no) return -1;
          if (b.card_no) return 1;
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });
        
        setFlashcards(sortedCards);
        setFavorites(new Set(sortedCards.filter(card => card.favorite).map(card => card.id)));
      } catch (error) {
        console.error('Error fetching flashcards:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlashcards();
  }, [chapterId]);

  const toggleFavorite = async (cardId: string) => {
    try {
      const newFavoriteStatus = !favorites.has(cardId);
      const flashcardRef = doc(db, 'flashcards', cardId);
      
      await updateDoc(flashcardRef, {
        favorite: newFavoriteStatus
      });

      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (newFavoriteStatus) {
          newFavorites.add(cardId);
        } else {
          newFavorites.delete(cardId);
        }
        return newFavorites;
      });
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  const renderShimmerLoading = () => (
    <View className="flex-1 justify-center items-center">
      <View className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 min-h-[200px] w-[90%]">
        <View className="p-6">
          <View className="flex-row justify-end items-start mb-4">
            <ShimmerPlaceholder
              style={{ width: 24, height: 24, borderRadius: 12 }}
            />
          </View>
          <View className="items-center justify-center">
            <ShimmerPlaceholder
              style={{ width: 200, height: 24, marginBottom: 16, borderRadius: 4 }}
            />
            <ShimmerPlaceholder
              style={{ width: '100%', height: 16, marginBottom: 8, borderRadius: 4 }}
            />
            <ShimmerPlaceholder
              style={{ width: '80%', height: 16, marginBottom: 8, borderRadius: 4 }}
            />
            <ShimmerPlaceholder
              style={{ width: '90%', height: 16, borderRadius: 4 }}
            />
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-grey-50">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="px-4 py-6 flex-1">
          {renderShimmerLoading()}
        </View>
      </SafeAreaView>
    );
  }

  if (flashcards.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-grey-50">
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View className="px-4 py-6">
          <Text className="text-2xl font-montserrat-bold text-gray-800 mb-2">
            Flashcards
          </Text>
          <View className="flex-1 justify-center items-center py-20">
            <MaterialIcons name="school" size={48} color="#9CA3AF" />
            <Text className="text-center text-sm text-gray-500 font-montserrat">
              No flashcards found for this chapter
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-grey-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="flex-1 py-6">
        <Text className="text-2xl font-montserrat-bold text-gray-800 mb-4 px-4">
          Flashcards ({flashcards.length})
        </Text>
        
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          className="flex-1"
        >
          {flashcards.map((card, index) => (
            <View 
              key={card.id} 
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 min-h-[200px] mx-2 w-[350px]"
            >
              <View className="p-6">
                <View className="flex-row justify-between items-start">
                  <Text className="text-gray-500 font-montserrat-bold">
                    {/* Card {card.card_no} */}
                  </Text>
                  <TouchableOpacity onPress={() => toggleFavorite(card.id)}>
                    <MaterialIcons 
                      name={favorites.has(card.id) ? "star" : "star-border"}
                      size={24}
                      color={favorites.has(card.id) ? "#F59E0B" : "#9CA3AF"}
                    />
                  </TouchableOpacity>
                </View>
                
                <View className="items-center justify-center">
                  <Text className="text-gray-800 font-montserrat-bold text-xl text-center mb-4">
                    {card.title}
                  </Text>
                  <ScrollView 
                    className="w-full" 
                    style={{ maxHeight: 600 }}
                    showsVerticalScrollIndicator={true}
                  >
                    <View className="flex-col w-full mb-5">
                      {card.description.split('.').map((segment, idx) => (
                        segment.trim() && (
                          <View 
                            key={idx} 
                            className="mb-2 w-full"
                          >
                            <Text 
                              className={`text-gray-600 font-montserrat text-base ${
                                idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-100'
                              } px-1`}
                            >
                              {segment.trim() + (idx < card.description.split('.').length - 1 ? '.' : '')}
                            </Text>
                          </View>
                        )
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default FlashcardList;
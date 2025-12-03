import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, SafeAreaView, Animated, Easing,StatusBar } from 'react-native';
import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { createShimmerPlaceholder } from 'react-native-shimmer-placeholder';
import { LinearGradient } from 'expo-linear-gradient';

const ShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

interface Subject {
  id: string;
  name: string;
}

const SubjectListScreen: React.FC = () => {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'subjects'));
        setSubjects(querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().subject_name,
        })));
      } catch (error) {
        console.error('Error fetching subjects:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const renderShimmerLoading = () => (
    <>
      {[1, 2, 3, 4].map((_, index) => (
        <View 
          key={index}
          className="bg-white rounded-2xl p-4 mb-4 mx-4"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <ShimmerPlaceholder
                style={{ width: 150, height: 20, marginBottom: 8, borderRadius: 4 }}
              />
              <ShimmerPlaceholder
                style={{ width: 100, height: 16, borderRadius: 4 }}
              />
            </View>
            <ShimmerPlaceholder
              style={{ width: 40, height: 40, borderRadius: 20 }}
            />
          </View>
        </View>
      ))}
    </>
  );

  const renderSubjectCard = ({ item }: { item: Subject }) => {
    const scaleAnim = new Animated.Value(1);
    
    const onPressIn = () => {
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.ease
      }).start();
    };

    const onPressOut = () => {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.ease
      }).start();
    };

    return (
      <TouchableOpacity 
        onPress={() => router.push({
          pathname: "/(tools)/ChapterList",
          params: { subjectId: item.id, subjectName: item.name }
        })}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
      >
        <Animated.View 
          style={[
            { transform: [{ scale: scaleAnim }] }
          ]}
          className="bg-white rounded-2xl p-4 mb-4 mx-2 shadow"
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-md d text-gray-800 mb-2 font-montserrat-bold">
                {item.name}
              </Text>
              <Text className="text-sm text-gray-500 font-montserrat">
                Tap to view chapters
              </Text>
            </View>
            <View className="bg-blue-500 w-10 h-10 rounded-full items-center justify-center">
              <Text className="text-white text-md font-montserrat-bold">
                {item.name.charAt(0)}
              </Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 py-4 bg-grey-50">
       <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* <View className="px-6 mt-6">
        <Text className="text-2xl text-gray-800 mb-2 font-montserrat-bold">
          Subjects
        </Text>
        <Text className="text-gray-500 mb-6 font-montserrat">
          Select a subject to view chapters
        </Text>
      </View> */}
      
      {loading ? (
        <View>{renderShimmerLoading()}</View>
      ) : (
        <FlatList
          data={subjects}
          renderItem={renderSubjectCard}
          keyExtractor={item => item.id}
          className="flex-1"
          contentContainerClassName="pb-6"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default SubjectListScreen;

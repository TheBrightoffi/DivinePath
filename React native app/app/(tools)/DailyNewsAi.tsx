import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions
} from 'react-native';

const GEMINI_API_KEY = 'AIzaSyDDSQ1fII-hsSvrW7UrOcS-xzLA8NqtXWw'; // <-- Replace this with your key
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const NewsScreen = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('upsc');
  const { width } = useWindowDimensions();

  const categories = [
    { id: 'upsc', name: 'UPSC News' },
    { id: 'current', name: 'Current Affairs' },
    { id: 'geopolitical', name: 'Geopolitical' },
    { id: 'india', name: 'India News' },
  ];

  const getPromptForCategory = (category) => {
    switch (category) {
      case 'upsc':
        return "List 10 latest UPSC (Indian Civil Services) relevant news and current affairs. Include a 1-2 line summary for each in numbered format.";
      case 'current':
        return "List 10 most important current affairs news globally. Include a 1-2 line summary for each in numbered format.";
      case 'geopolitical':
        return "List 10 latest geopolitical news and international relations updates. Include a 1-2 line summary for each in numbered format.";
      case 'india':
        return "List 10 latest important news headlines from India. Include a 1-2 line summary for each in numbered format.";
      default:
        return "List 10 latest UPSC relevant news. Include a 1-2 line summary for each in numbered format.";
    }
  };

  const getTodaysNews = async (category) => {
    setLoading(true);
    const prompt = {
      contents: [
        {
          parts: [
            {
              text: getPromptForCategory(category)
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt),
      });

      const data = await response.json();
      console.log('Response from Gemini:', data); // For debugging

      const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textOutput) {
        throw new Error('No content returned from Gemini.');
      }

      const parsedNews = textOutput
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./))
        .map(line => {
          const content = line.replace(/^\d+\.\s*/, '');
          const parts = content.split(':');
          return {
            title: `**${parts[0].trim()}**`,
            description: parts[1]?.trim() || ''
          };
        });

      setNews(parsedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      setNews([{ title: '⚠️ Could not fetch news', description: 'Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTodaysNews(activeCategory);
  }, [activeCategory]);

  const renderNewsItem = ({ item, index }) => (
    <View 
      style={{ width: width - 32 }}
      className="bg-white mx-2 my-4 rounded-xl p-4 shadow-sm border border-gray-200"
    >
      <View className="flex-row items-start">
        <View className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center mt-1">
          <Text className="text-white font-bold">{index + 1}</Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-2xl font-bold text-gray-900 mb-2 font-montserrat">{item.title}</Text>
          <Text className="text-xl text-gray-600 leading-5 font-montserrat">{item.description}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className=" bg-gray-100">
      <StatusBar barStyle="dark-content" />
      <View className="px-4 py-6">
        <Text className="text-2xl font-bold text-gray-800 mb-4 font-montserrat">Today's Top 10 News (AI generated)</Text>
        
        <View className="flex-row flex-wrap gap-2 mb-4">
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full ${
                activeCategory === category.id ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            >
              <Text
                className={`font-medium ${
                  activeCategory === category.id ? 'text-white' : 'text-gray-700'
                } font-montserrat`}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4B5563" />
        </View>
      ) : (
        <FlatList
          data={news}
          renderItem={renderNewsItem}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          snapToInterval={width - 32}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 14 }}
        />
      )}
    </SafeAreaView>
  );
};

export default NewsScreen;

import React from 'react';
import { View, StyleSheet,StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

const News = () => {
  return (
    <View style={styles.container}>
       <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView 
        source={{ uri: 'https://www.thehindu.com/' }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default News;
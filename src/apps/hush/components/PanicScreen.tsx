import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';

export const PanicScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notes</Text>
        <Text style={styles.headerAction}>Done</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.date}>Today at 10:42 AM</Text>
        <Text style={styles.text}>Groceries:</Text>
        <Text style={styles.text}>- Milk</Text>
        <Text style={styles.text}>- Eggs</Text>
        <Text style={styles.text}>- Bread</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Boring White
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerAction: {
    fontSize: 18,
    color: '#E0A326', // Apple Notes Yellowish-Orange
    fontWeight: '600',
  },
  body: {
    flex: 1,
  },
  date: {
    color: '#999',
    marginBottom: 10,
    fontSize: 14,
    textAlign: 'center',
  },
  text: {
    fontSize: 18,
    color: '#fff',
    lineHeight: 28,
  },
});

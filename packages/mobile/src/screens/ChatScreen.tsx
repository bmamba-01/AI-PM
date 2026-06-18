import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: Date;
}

export function ChatScreen({ navigation }: Props) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Ask me about sprint status, risks, or budget...', sender: 'agent', timestamp: new Date() },
  ]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTimeout(() => {
      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Processing your request...',
        sender: 'agent',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 500);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.message, item.sender === 'user' ? styles.userMsg : styles.agentMsg]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor="#6b7280"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  message: { maxWidth: '80%', borderRadius: 12, padding: 12, marginVertical: 4, marginHorizontal: 16 },
  userMsg: { backgroundColor: '#4f46e5', alignSelf: 'flex-end' },
  agentMsg: { backgroundColor: '#1e293b', alignSelf: 'flex-start' },
  messageText: { color: '#ffffff', fontSize: 14 },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  sendBtn: { backgroundColor: '#4f46e5', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  sendText: { color: '#ffffff', fontWeight: '600' },
});
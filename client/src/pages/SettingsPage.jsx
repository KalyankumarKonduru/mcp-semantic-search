import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  useToast,
  Divider,
  Switch,
  Select,
  Badge,
  Flex,
  InputGroup,
  InputRightElement,
  IconButton
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

const SettingsPage = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [embeddingModel, setEmbeddingModel] = useState('biobert');
  const toast = useToast();

  // Load settings on initial render
  useEffect(() => {
    const savedApiKey = localStorage.getItem('apiKey') || '';
    const savedApiEndpoint = localStorage.getItem('apiEndpoint') || '';
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedEmbeddingModel = localStorage.getItem('embeddingModel') || 'biobert';
    
    setApiKey(savedApiKey);
    setApiEndpoint(savedApiEndpoint);
    setDarkMode(savedDarkMode);
    setEmbeddingModel(savedEmbeddingModel);
  }, []);

  const handleSaveSettings = () => {
    // Save to localStorage
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('apiEndpoint', apiEndpoint);
    localStorage.setItem('darkMode', darkMode.toString());
    localStorage.setItem('embeddingModel', embeddingModel);
    
    toast({
      title: 'Settings saved',
      description: 'Your settings have been saved successfully',
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings?')) {
      localStorage.removeItem('apiKey');
      localStorage.removeItem('apiEndpoint');
      localStorage.removeItem('darkMode');
      localStorage.removeItem('embeddingModel');
      
      setApiKey('');
      setApiEndpoint('');
      setDarkMode(false);
      setEmbeddingModel('biobert');
      
      toast({
        title: 'Settings reset',
        description: 'All settings have been reset to defaults',
        status: 'info',
        duration: 3000,
        isClosable: true
      });
    }
  };

  return (
    <Container maxW="800px">
      <Box mb={8}>
        <Heading size="lg" mb={2}>Settings</Heading>
        <Text color="gray.600">
          Configure your semantic search application
        </Text>
      </Box>
      
      <Box p={6} shadow="md" borderWidth="1px" borderRadius="md">
        <VStack spacing={6} align="stretch">
          <Heading size="md">API Configuration</Heading>
          
          <FormControl>
            <FormLabel>API Endpoint</FormLabel>
            <Input
              placeholder="http://localhost:3000/api/v1"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>API Key</FormLabel>
            <InputGroup>
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <InputRightElement>
                <IconButton
                  icon={showApiKey ? <ViewOffIcon /> : <ViewIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowApiKey(!showApiKey)}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
          
          <Divider />
          
          <Heading size="md">Application Settings</Heading>
          
          <FormControl display="flex" alignItems="center">
            <FormLabel htmlFor="dark-mode" mb="0">
              Dark Mode
            </FormLabel>
            <Switch
              id="dark-mode"
              colorScheme="blue"
              isChecked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
          </FormControl>
          
          <FormControl>
            <FormLabel>Embedding Model</FormLabel>
            <Select
              value={embeddingModel}
              onChange={(e) => setEmbeddingModel(e.target.value)}
            >
              <option value="biobert">BioBERT</option>
              <option value="clinicalbert">ClinicalBERT</option>
              <option value="pubmedbert">PubMedBERT</option>
            </Select>
          </FormControl>
          
          <Divider />
          
          <Flex justify="space-between">
            <Button colorScheme="blue" onClick={handleSaveSettings}>
              Save Settings
            </Button>
            <Button variant="outline" colorScheme="red" onClick={handleResetSettings}>
              Reset to Defaults
            </Button>
          </Flex>
          
          <Box>
            <Heading size="sm" mb={2}>Current Configuration</Heading>
            <Flex wrap="wrap" gap={2}>
              <Badge colorScheme="blue">API: {apiEndpoint ? 'Configured' : 'Not Set'}</Badge>
              <Badge colorScheme="green">Auth: {apiKey ? 'Configured' : 'Not Set'}</Badge>
              <Badge colorScheme="purple">Model: {embeddingModel}</Badge>
              <Badge colorScheme="gray">Theme: {darkMode ? 'Dark' : 'Light'}</Badge>
            </Flex>
          </Box>
        </VStack>
      </Box>
    </Container>
  );
};

export default SettingsPage;
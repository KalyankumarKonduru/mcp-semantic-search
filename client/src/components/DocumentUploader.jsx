import React, { useState, useRef } from 'react';
import { 
  Box, 
  Button, 
  FormControl, 
  FormLabel, 
  Input, 
  Textarea,
  VStack,
  Heading,
  useToast,
  Progress,
  Text,
  Select,
  HStack
} from '@chakra-ui/react';
import { documentApi } from '../api';

const DocumentUploader = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [noteType, setNoteType] = useState('progress_note');
  const [department, setDepartment] = useState('');
  const fileInputRef = useRef(null);
  const toast = useToast();

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
      // Clear text input when file is selected
      setText('');
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    // Clear file input when text is entered
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!file && !text.trim()) {
      toast({
        title: 'Input required',
        description: 'Please upload a file or enter text',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    setIsLoading(true);
    setUploadProgress(10);
    
    try {
      // Prepare metadata
      const metadata = {
        note_type: noteType,
        department: department || undefined,
        date: new Date().toISOString().split('T')[0]
      };
      
      let response;
      
      if (file) {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 300);
        
        // Upload file
        response = await documentApi.uploadDocument(file, metadata);
        
        clearInterval(progressInterval);
      } else {
        // Upload text directly
        response = await documentApi.createDocument(text, metadata);
      }
      
      setUploadProgress(100);
      
      toast({
        title: 'Document uploaded',
        description: 'Document has been successfully processed',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      
      // Reset form
      setText('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent
      if (onUploadComplete) {
        onUploadComplete(response.data);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.response?.data?.error || 'An error occurred during upload',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit} width="full">
      <VStack spacing={4} align="stretch">
        <Heading size="md">Upload Document</Heading>
        
        <FormControl>
          <FormLabel>Document Type</FormLabel>
          <Select 
            value={noteType} 
            onChange={(e) => setNoteType(e.target.value)}
          >
            <option value="progress_note">Progress Note</option>
            <option value="discharge_summary">Discharge Summary</option>
            <option value="consultation">Consultation</option>
            <option value="lab_report">Lab Report</option>
            <option value="radiology_report">Radiology Report</option>
            <option value="other">Other</option>
          </Select>
        </FormControl>
        
        <FormControl>
          <FormLabel>Department (Optional)</FormLabel>
          <Input 
            placeholder="e.g., Cardiology, Neurology, etc."
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </FormControl>
        
        <FormControl>
          <FormLabel>Upload File</FormLabel>
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.pdf,.doc,.docx"
            p={1}
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            Supported formats: TXT, PDF, DOC, DOCX
          </Text>
        </FormControl>
        
        <Text fontWeight="bold" textAlign="center">OR</Text>
        
        <FormControl>
          <FormLabel>Enter Text</FormLabel>
          <Textarea
            placeholder="Paste or type document text here..."
            value={text}
            onChange={handleTextChange}
            minHeight="200px"
          />
        </FormControl>
        
        {uploadProgress > 0 && (
          <Progress 
            value={uploadProgress} 
            size="sm" 
            colorScheme="blue" 
            borderRadius="md"
          />
        )}
        
        <Button
          type="submit"
          colorScheme="blue"
          isLoading={isLoading}
          loadingText="Uploading..."
        >
          Upload Document
        </Button>
      </VStack>
    </Box>
  );
};

export default DocumentUploader;
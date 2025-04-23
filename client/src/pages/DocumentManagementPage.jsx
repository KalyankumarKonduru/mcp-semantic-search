import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text,
  Grid,
  GridItem,
  Divider,
  Button,
  useToast,
  Spinner,
  Center,
  VStack,
  Badge,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton
} from '@chakra-ui/react';
import { DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import DocumentUploader from '../components/DocumentUploader';
import { documentApi } from '../api';

const DocumentManagementPage = () => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Fetch documents on initial load
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async (pageNum = 1) => {
    setIsLoading(true);
    
    try {
      const response = await documentApi.listDocuments(pageNum, 10);
      
      if (pageNum === 1) {
        setDocuments(response.data.documents || []);
      } else {
        setDocuments(prev => [...prev, ...(response.data.documents || [])]);
      }
      
      setPage(pageNum);
      setHasMore((response.data.documents || []).length === 10);
      
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: 'Error fetching documents',
        description: error.response?.data?.error || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = () => {
    // Refresh document list after upload
    fetchDocuments(1);
  };

  const handleDeleteDocument = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }
    
    try {
      await documentApi.deleteDocument(id);
      
      toast({
        title: 'Document deleted',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      
      // Refresh document list
      fetchDocuments(1);
      
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error deleting document',
        description: error.response?.data?.error || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleViewDocument = async (id) => {
    try {
      const response = await documentApi.getDocument(id);
      setSelectedDocument(response.data);
      onOpen();
    } catch (error) {
      console.error('Error fetching document:', error);
      toast({
        title: 'Error fetching document',
        description: error.response?.data?.error || 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const loadMoreDocuments = () => {
    fetchDocuments(page + 1);
  };

  return (
    <Container maxW="1200px">
      <Box mb={8}>
        <Heading size="lg" mb={2}>Document Management</Heading>
        <Text color="gray.600">
          Upload, view, and manage EHR documents for semantic search
        </Text>
      </Box>
      
      <Grid templateColumns={{ base: '1fr', md: '1fr 2fr' }} gap={8}>
        <GridItem>
          <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
            <DocumentUploader onUploadComplete={handleUploadComplete} />
          </Box>
        </GridItem>
        
        <GridItem>
          <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
            <Heading size="md" mb={4}>Document List</Heading>
            
            {isLoading && page === 1 ? (
              <Center p={10}>
                <Spinner size="xl" />
              </Center>
            ) : documents.length === 0 ? (
              <Center p={10}>
                <VStack>
                  <Text>No documents found</Text>
                  <Text fontSize="sm" color="gray.500">
                    Upload documents to start using semantic search
                  </Text>
                </VStack>
              </Center>
            ) : (
              <>
                <TableContainer>
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Document</Th>
                        <Th>Type</Th>
                        <Th>Date</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {documents.map((doc) => (
                        <Tr key={doc.id}>
                          <Td>{doc.title || doc.id}</Td>
                          <Td>
                            <Badge colorScheme="blue">
                              {doc.metadata?.note_type || 'Document'}
                            </Badge>
                          </Td>
                          <Td>{doc.metadata?.date || 'N/A'}</Td>
                          <Td>
                            <Flex gap={2}>
                              <IconButton
                                aria-label="View document"
                                icon={<ViewIcon />}
                                size="sm"
                                colorScheme="blue"
                                onClick={() => handleViewDocument(doc.id)}
                              />
                              <IconButton
                                aria-label="Delete document"
                                icon={<DeleteIcon />}
                                size="sm"
                                colorScheme="red"
                                onClick={() => handleDeleteDocument(doc.id)}
                              />
                            </Flex>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
                
                {hasMore && (
                  <Center mt={4}>
                    <Button 
                      onClick={loadMoreDocuments} 
                      isLoading={isLoading}
                      size="sm"
                    >
                      Load More
                    </Button>
                  </Center>
                )}
              </>
            )}
          </Box>
        </GridItem>
      </Grid>
      
      {/* Document view modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedDocument?.title || 'Document Details'}
            {selectedDocument?.metadata?.note_type && (
              <Badge ml={2} colorScheme="blue">
                {selectedDocument.metadata.note_type}
              </Badge>
            )}
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody>
            {selectedDocument ? (
              <Box>
                <Flex wrap="wrap" gap={2} mb={4}>
                  {selectedDocument.metadata?.date && (
                    <Badge colorScheme="green">Date: {selectedDocument.metadata.date}</Badge>
                  )}
                  {selectedDocument.metadata?.department && (
                    <Badge colorScheme="purple">Dept: {selectedDocument.metadata.department}</Badge>
                  )}
                  {selectedDocument.id && (
                    <Badge colorScheme="gray">ID: {selectedDocument.id}</Badge>
                  )}
                </Flex>
                
                <Divider mb={4} />
                
                <Box 
                  p={4} 
                  borderRadius="md" 
                  bg="gray.50" 
                  maxHeight="50vh" 
                  overflowY="auto"
                >
                  <Text whiteSpace="pre-wrap">{selectedDocument.text}</Text>
                </Box>
                
                {selectedDocument.chunks && selectedDocument.chunks.length > 0 && (
                  <Box mt={4}>
                    <Heading size="sm" mb={2}>Document Chunks</Heading>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      This document has been split into {selectedDocument.chunks.length} chunks for semantic search
                    </Text>
                    
                    {selectedDocument.chunks.map((chunk, idx) => (
                      <Box 
                        key={idx} 
                        p={2} 
                        borderWidth="1px" 
                        borderRadius="md" 
                        mt={2}
                        fontSize="sm"
                      >
                        <Text fontWeight="bold">Chunk {idx + 1}</Text>
                        <Text noOfLines={2}>{chunk.text}</Text>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            ) : (
              <Center p={10}>
                <Spinner />
              </Center>
            )}
          </ModalBody>
          
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
};

export default DocumentManagementPage;
import React from 'react';
import { 
  Box, 
  VStack, 
  Text, 
  Badge, 
  Divider,
  Heading,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';

const SearchResults = ({ results, query, executionTimeMs }) => {
  if (!results || results.length === 0) {
    return (
      <Box p={5} shadow="md" borderWidth="1px" borderRadius="md">
        <Text>No results found for your query.</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" mb={4}>
        <Heading size="md">Search Results</Heading>
        
        <Flex gap={4}>
          <Stat size="sm" textAlign="right">
            <StatLabel>Results</StatLabel>
            <StatNumber>{results.length}</StatNumber>
          </Stat>
          
          <Stat size="sm" textAlign="right">
            <StatLabel>Time</StatLabel>
            <StatNumber>{executionTimeMs}ms</StatNumber>
          </Stat>
        </Flex>
      </Flex>
      
      <VStack spacing={4} align="stretch">
        {results.map((result, index) => (
          <Box 
            key={index} 
            p={5} 
            shadow="md" 
            borderWidth="1px" 
            borderRadius="md"
            _hover={{ shadow: 'lg' }}
            transition="box-shadow 0.3s"
          >
            <Flex justify="space-between" mb={2}>
              <Flex wrap="wrap" gap={2}>
                <Badge colorScheme="blue">{result.metadata.note_type || 'Document'}</Badge>
                {result.metadata.department && (
                  <Badge colorScheme="purple">{result.metadata.department}</Badge>
                )}
                {result.metadata.date && (
                  <Badge colorScheme="green">{result.metadata.date}</Badge>
                )}
              </Flex>
              
              <Badge colorScheme="teal" variant="outline">
                Score: {result.score.toFixed(2)}
              </Badge>
            </Flex>
            
            <Divider my={2} />
            
            <Box mt={2}>
              {result.highlight ? (
                <div dangerouslySetInnerHTML={{ __html: result.highlight }} />
              ) : (
                <Text>{result.text}</Text>
              )}
            </Box>
            
            {result.metadata.doc_id && (
              <Text fontSize="xs" color="gray.500" mt={2}>
                Document ID: {result.metadata.doc_id}
              </Text>
            )}
          </Box>
        ))}
      </VStack>
    </Box>
  );
};

export default SearchResults;
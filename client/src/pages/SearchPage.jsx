import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast
} from '@chakra-ui/react';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import { searchApi, mcpApi } from '../api';

const SearchPage = () => {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchStats, setSearchStats] = useState({
    query: '',
    executionTimeMs: 0
  });
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();

  const handleSearch = async (searchParams) => {
    setIsLoading(true);
    setResults([]);
    
    try {
      let response;
      
      // Handle different search types based on the active tab
      if (activeTab === 0) {
        // Semantic search
        if (searchParams.isHybrid && searchParams.keywords) {
          response = await searchApi.hybridSearch(
            searchParams.query,
            searchParams.keywords,
            10
          );
        } else {
          response = await searchApi.semanticSearch(searchParams.query, 10);
        }
      } else if (activeTab === 1) {
        // MCP context
        response = await mcpApi.getContext(searchParams.query, 10);
        
        // Convert MCP response format to search results format
        if (response.data && response.data.contexts) {
          response.data.results = response.data.contexts.map(context => ({
            text: context.text,
            score: context.relevance_score,
            metadata: {
              doc_id: context.source.document_id,
              note_type: context.source.note_type,
              date: context.source.date,
              department: context.source.department
            }
          }));
          
          response.data.executionTimeMs = response.data.metadata.query_time_ms;
        }
      }
      
      setResults(response.data.results || []);
      setSearchStats({
        query: searchParams.query,
        executionTimeMs: response.data.executionTimeMs || 0
      });
      
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: error.response?.data?.error || 'An error occurred during search',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxW="1200px">
      <Box mb={8}>
        <Heading size="lg" mb={2}>Semantic EHR Search</Heading>
        <Text color="gray.600">
          Search through EHR notes using natural language or medical terms
        </Text>
      </Box>
      
      <Tabs onChange={index => setActiveTab(index)} colorScheme="blue">
        <TabList>
          <Tab>Semantic Search</Tab>
          <Tab>MCP Context</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Box mb={6}>
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              <Text fontSize="sm" color="gray.500" mt={2}>
                Try queries like: "patients with medication side effects" or "abnormal lab results in diabetic patients"
              </Text>
            </Box>
            
            <Divider my={6} />
            
            <SearchResults 
              results={results} 
              query={searchStats.query}
              executionTimeMs={searchStats.executionTimeMs}
            />
          </TabPanel>
          
          <TabPanel>
            <Box mb={6}>
              <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              <Text fontSize="sm" color="gray.500" mt={2}>
                MCP context provides rich context for AI agents and applications
              </Text>
            </Box>
            
            <Divider my={6} />
            
            <SearchResults 
              results={results} 
              query={searchStats.query}
              executionTimeMs={searchStats.executionTimeMs}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
};

export default SearchPage;
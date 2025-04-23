import React, { useState } from 'react';
import { 
  Box, 
  Input, 
  Button, 
  Flex, 
  FormControl,
  FormLabel,
  Switch,
  useToast,
  IconButton
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';

const SearchBar = ({ onSearch, isLoading }) => {
  const [query, setQuery] = useState('');
  const [isHybridSearch, setIsHybridSearch] = useState(false);
  const [keywords, setKeywords] = useState('');
  const toast = useToast();

  const handleSearch = (e) => {
    e.preventDefault();
    
    if (!query && (!isHybridSearch || !keywords)) {
      toast({
        title: 'Search query required',
        description: 'Please enter a search query',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }
    
    onSearch({
      query,
      keywords: isHybridSearch ? keywords : null,
      isHybrid: isHybridSearch
    });
  };

  return (
    <Box as="form" onSubmit={handleSearch} width="full">
      <Flex direction="column" gap={3}>
        <FormControl display="flex" alignItems="center" justifyContent="flex-end">
          <FormLabel htmlFor="hybrid-search" mb="0" fontSize="sm">
            Enable hybrid search
          </FormLabel>
          <Switch 
            id="hybrid-search" 
            colorScheme="blue"
            isChecked={isHybridSearch}
            onChange={(e) => setIsHybridSearch(e.target.checked)}
          />
        </FormControl>
        
        <Flex gap={2}>
          <Input
            placeholder="Enter semantic search query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            size="lg"
            borderRadius="md"
          />
          
          <IconButton
            type="submit"
            aria-label="Search"
            icon={<SearchIcon />}
            size="lg"
            colorScheme="blue"
            isLoading={isLoading}
            borderRadius="md"
          />
        </Flex>
        
        {isHybridSearch && (
          <Input
            placeholder="Additional keywords (optional)..."
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            size="md"
            mt={2}
          />
        )}
      </Flex>
    </Box>
  );
};

export default SearchBar;
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider, Box, CSSReset } from '@chakra-ui/react';
import Navbar from './components/Navbar';
import SearchPage from './pages/SearchPage';
import DocumentManagementPage from './pages/DocumentManagementPage';
import SettingsPage from './pages/SettingsPage';
import theme from './theme';

function App() {
  return (
    <ChakraProvider theme={theme}>
      <CSSReset />
      <Router>
        <Box minH="100vh">
          <Navbar />
          <Box as="main" p={4}>
            <Routes>
              <Route path="/" element={<SearchPage />} />
              <Route path="/documents" element={<DocumentManagementPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ChakraProvider>
  );
}

export default App;
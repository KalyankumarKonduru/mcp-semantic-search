import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#e6f7ff',
      100: '#b8e6ff',
      200: '#8ad5ff',
      300: '#5cc3ff',
      400: '#2eb2ff',
      500: '#0099ff',
      600: '#007acc',
      700: '#005c99',
      800: '#003d66',
      900: '#001f33',
    },
  },
  fonts: {
    heading: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'md',
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: '600',
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'blue.500',
      },
    },
    Textarea: {
      defaultProps: {
        focusBorderColor: 'blue.500',
      },
    },
  },
});

export default theme;
import React from 'react';
import { Container } from '@mui/material';
import LoggerBox from './components/loggerBox'

const Home = () => {
  return (
    <Container maxWidth="lg" style={{ padding: '16px' }}>
      <LoggerBox />
    </Container>
  );
};

export default Home;

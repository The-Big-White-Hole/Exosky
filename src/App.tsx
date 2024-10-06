import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Main from './pages/Main';
import Explorer from './pages/Explorer';
import PlanetView from './pages/Planet';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/planet" element={<PlanetView />} />
      </Routes>
    </Router>
  );
};

export default App;


